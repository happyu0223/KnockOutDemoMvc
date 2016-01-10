using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;

namespace KnockOutDemoMvc.Controllers
{
    public class  Pepople 
    {
        public int ID { get; set; }
        public string   Name { get; set; }
    }
    public class HomeController : BaseController
    {
        //
        // GET: /Home/
        public ActionResult GetPepopleList()
        {
            var result = new List<Pepople>
            {
                new Pepople{ID=1,Name="test1"},
                new Pepople{ID=2,Name="test2"},
                new Pepople{ID=3,Name="test3"},
                new Pepople{ID=4,Name="test4"},
                new Pepople{ID=5,Name="test5"},
                new Pepople{ID=6,Name="test6"},
            };
            //var connectedContract = ManagersProvider.ContractWholeManager.GetViewModelByContractInfoId(id);
            //return JavaScriptJson(new AjaxReturnInfo { Data = connectedContract }, JsonRequestBehavior.AllowGet);

            //var data = ManagersProvider.LongContractManager.List(paramter, pagination);
            //var result = new AjaxReturnInfo { Data = new { pagination = pagination, result = data, } };
            //return Json(result, JsonRequestBehavior.AllowGet);
            return Json(new AjaxReturnInfo { Data = result }, JsonRequestBehavior.AllowGet);
        }

        public List<Pepople> GetList()
        {
            var result = new List<Pepople>
            {
                new Pepople{ID=1,Name="test1"},
                new Pepople{ID=2,Name="test2"},
                new Pepople{ID=3,Name="test3"},
                new Pepople{ID=4,Name="test4"},
                new Pepople{ID=5,Name="test5"},
                new Pepople{ID=6,Name="test6"},
            };
            return result;
            //  return JavaScriptJson(new AjaxReturnInfo { Status = true, Data = result }, JsonRequestBehavior.AllowGet);
        }
        public ActionResult Index()
        {
            return View(new List<Pepople>
            {
                new Pepople{ID=1,Name="test1"},
                new Pepople{ID=2,Name="test2"},
                new Pepople{ID=3,Name="test3"},
                new Pepople{ID=4,Name="test4"},
                new Pepople{ID=5,Name="test5"},
                new Pepople{ID=6,Name="test6"},
            });
        }

        public ActionResult MultiSelectList()
        {
            return View();
        }

        public ActionResult Detail()
        {
            return View();
        }
    }
}
