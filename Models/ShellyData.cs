namespace ShellyReceiver.Models
{
    public class ShellyData
    {
        public int Id { get; set; }

        public string IdDispositivo { get; set; } // ← Nuevo campo para identificar el Shelly

        public double apower { get; set; }

        public double voltage { get; set; }

        public double corriente { get; set; }

        public double aenergy { get; set; }

        public double temperature { get; set; } // ← Si ya lo estás enviando, inclúyelo aquí

        
        public DateTime Fecha { get; set; } = DateTime.UtcNow;

    }
}
