using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ShellyReceiver.Models;
using ShellyReceiver.Data;
using System.Threading.Tasks;
using System.Linq;

namespace ShellyReceiver.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ShellyController : ControllerBase
    {
        private readonly ShellyDbContext _context;

        public ShellyController(ShellyDbContext context)
        {
            _context = context;
        }

        [HttpPost("datos")]
        public async Task<IActionResult> RecibirDatos([FromBody] ShellyData data)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(data.IdDispositivo))
                    return BadRequest("Falta el ID del dispositivo");

                _context.DatosShelly.Add(data);
                await _context.SaveChangesAsync();

                return Ok(new { mensaje = "Datos guardados correctamente" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    error = "Error al guardar los datos",
                    detalle = ex.InnerException?.Message ?? ex.Message
                });
            }
        }

        [HttpGet("ultimos")]
        public async Task<IActionResult> ObtenerUltimos()
        {
            var datos = await _context.DatosShelly
                .OrderByDescending(d => d.Fecha)
                .Take(20)
                .ToListAsync();

            return Ok(datos);
        }

        [HttpGet("24h")]
        public async Task<IActionResult> Obtener24Horas()
        {
            var hace24h = DateTime.UtcNow.AddHours(-24);

            var datos = await _context.DatosShelly
                .Where(d => d.Fecha >= hace24h)
                .OrderBy(d => d.Fecha)
                .ToListAsync();

            return Ok(new
            {
                datos = datos.Select(x => new
                {
                    x.Fecha,
                    x.apower,
                    x.voltage,
                    x.temperature,
                    x.IdDispositivo
                })
            });
        }
    }
}
