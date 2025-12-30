using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ShellyReceiver.Data;
using System.Globalization;

namespace ShellyReceiver.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class EstadisticasController : ControllerBase
    {
        private readonly ShellyDbContext _context;

        public EstadisticasController(ShellyDbContext context)
        {
            _context = context;
        }

        [HttpGet("dia")]
        public async Task<IActionResult> Dia(string dispositivo, string fechaInicio, string fechaFin)
        {
            TimeZoneInfo limaZone = TimeZoneInfo.FindSystemTimeZoneById("SA Pacific Standard Time");

            DateTime inicio = DateTime.Parse(fechaInicio);
            DateTime fin = DateTime.Parse(fechaFin).AddDays(1);

            // Convertir fechas a UTC para comparar con DB (que guarda UTC)
            DateTime inicioUTC = TimeZoneInfo.ConvertTimeToUtc(inicio, limaZone);
            DateTime finUTC = TimeZoneInfo.ConvertTimeToUtc(fin, limaZone);

            var datos = await _context.DatosShelly
                .Where(x => x.IdDispositivo == dispositivo && x.Fecha >= inicioUTC && x.Fecha < finUTC)
                .OrderBy(x => x.Fecha)
                .ToListAsync();

            double umbral = 2.0;
            bool estabaEncendido = false;
            DateTime? inicioUso = null;
            TimeSpan totalUso = TimeSpan.Zero;

            var historial = new List<object>();

            // Estado del día anterior
            var datoAnterior = await _context.DatosShelly
                .Where(x => x.IdDispositivo == dispositivo && x.Fecha < inicioUTC)
                .OrderByDescending(x => x.Fecha)
                .FirstOrDefaultAsync();

            bool estadoInicial = datoAnterior != null && datoAnterior.apower > umbral;
            double potenciaInicial = datoAnterior?.apower ?? 0;

            historial.Add(new
            {
                hora = "12:00:01 AM",
                estado = estadoInicial ? "Encendido" : "Apagado",
                potencia = estadoInicial ? potenciaInicial.ToString("0.##") : "0",
                tiempoUso = ""
            });

            estabaEncendido = estadoInicial;

            foreach (var d in datos)
            {
                DateTime horaLocal = TimeZoneInfo.ConvertTimeFromUtc(d.Fecha, limaZone);
                bool encendido = d.apower > umbral;

                if (!estabaEncendido && encendido)
                {
                    inicioUso = d.Fecha;
                    historial.Add(new
                    {
                        hora = horaLocal.ToString("hh:mm:ss tt", CultureInfo.InvariantCulture),
                        estado = "Encendido",
                        potencia = d.apower.ToString("0.##"),
                        tiempoUso = ""
                    });
                }
                else if (estabaEncendido && !encendido)
                {
                    if (inicioUso.HasValue)
                    {
                        var dur = d.Fecha - inicioUso.Value;
                        totalUso += dur;

                        historial.Add(new
                        {
                            hora = horaLocal.ToString("hh:mm:ss tt", CultureInfo.InvariantCulture),
                            estado = "Apagado",
                            potencia = d.apower.ToString("0.##"),
                            tiempoUso = dur.ToString(@"hh\:mm\:ss")
                        });
                    }
                }

                estabaEncendido = encendido;
            }

            // Cerrar el día solo si no es hoy
            if (fin.Date < DateTime.Now.Date)
            {
                historial.Add(new
                {
                    hora = "11:59:59 PM",
                    estado = estabaEncendido ? "Encendido" : "Apagado",
                    potencia = "-",
                    tiempoUso = "-"
                });
            }

            return Ok(new
            {
                fechaInicio,
                fechaFin,
                encendidos = historial.Count(x => ((dynamic)x).estado == "Encendido"),
                apagados = historial.Count(x => ((dynamic)x).estado == "Apagado"),
                tiempoUso = totalUso.ToString(@"hh\:mm\:ss"),
                historial
            });
        }
    }
}
