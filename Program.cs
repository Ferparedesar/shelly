using Microsoft.EntityFrameworkCore;
using ShellyReceiver.Data;

var builder = WebApplication.CreateBuilder(args);

// ✅ MVC (controladores con vistas)
builder.Services.AddControllersWithViews();

// ✅ Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// ✅ Base de datos SQL Server
builder.Services.AddDbContext<ShellyDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("ShellyConnection")));

var app = builder.Build();

// ✅ Swagger solo en desarrollo
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// ✅ Archivos estáticos (IMPORTANTE para CSS/JS)
app.UseStaticFiles();

// ✅ HTTPS
app.UseHttpsRedirection();

// ✅ Rutas API
app.MapControllers();

// ✅ Routing MVC para vistas
app.UseRouting();
app.UseAuthorization();

// ✅ Ruta por defecto
app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");

app.Run();
