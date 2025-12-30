using Microsoft.EntityFrameworkCore;
using ShellyReceiver.Models;

namespace ShellyReceiver.Data
{
    public class ShellyDbContext : DbContext
    {
        public ShellyDbContext(DbContextOptions<ShellyDbContext> options) : base(options) { }

        public DbSet<ShellyData> DatosShelly { get; set; }
    }
}




