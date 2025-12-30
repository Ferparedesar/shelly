using Microsoft.AspNetCore.Mvc;

namespace ShellyReceiver.Controllers
{
    public class HomeController : Controller
    {
        public IActionResult Index()
        {
            return View();
        }
        public IActionResult Estadisticas()
        {
            return View();
        }

    }
}
