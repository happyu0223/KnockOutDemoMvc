using KnockOutDemoMvc;
using KnockOutDemoMvc.Controllers;
using System;
using System.Collections;
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
        public bool IsCreated { get; set; }
    }
     public class Demo 
     { 
           public DateTime serverTime { get; set; }
           public int numUsers { get; set; }
           public int realUsers { get; set; }
     }
    public class PeopleViewModel 
    {
        public PeopleViewModel()
        {
            this.PeopleList = new List<Pepople>();
        }
        public int ID { get; set; }
        public string   Name { get; set; }
        public bool IsCreated { get; set; }
        public List<Pepople> PeopleList { get; set; }
        public Demo data1 { get; set; }
        public Pepople selectItem { get; set; }
    }
    
    public class HomeController : BaseController
    {
        //
        // GET: /Home/
        public static IList<Pepople> LoadDatas = new List<Pepople>
            {
                new Pepople{ID=1,Name="test1"},
                new Pepople{ID=2,Name="test2"},
                new Pepople{ID=3,Name="test3"},
                new Pepople{ID=4,Name="test4"},
                new Pepople{ID=5,Name="test5"},
                new Pepople{ID=6,Name="test6"},
            };
        public ActionResult GetPepopleList()
        {
            //var connectedContract = ManagersProvider.ContractWholeManager.GetViewModelByContractInfoId(id);
            //return JavaScriptJson(new AjaxReturnInfo { Data = result }, JsonRequestBehavior.AllowGet);

            //var data = ManagersProvider.LongContractManager.List(paramter, pagination);
            //var result = new AjaxReturnInfo { Data = new { pagination = pagination, result = data, } };
            //return Json(result, JsonRequestBehavior.AllowGet);
            return Json(new AjaxReturnInfo { Status = true, Data = LoadDatas }, JsonRequestBehavior.AllowGet);
        }

        public IList<Pepople> GetList()
        {
            //var result = PepopleList;
            return LoadDatas;
            //  return JavaScriptJson(new AjaxReturnInfo { Status = true, Data = result }, JsonRequestBehavior.AllowGet);
        }
        public ActionResult Index()
        {
            return View(LoadDatas);
        }

        public ActionResult MultiSelectList()
        {
            return View();
        }

        public ActionResult Detail()
        {
            return View();
        }
        [HttpPost]
        public ActionResult Save(PeopleViewModel viewModel)
        {
            MapperConfiguration.CreateMap<PeopleViewModel, Pepople>();
            MapperConfiguration.CreateMap<PeopleViewModel, Demo>();
            MapperConfiguration.CreateMap<PeopleViewModel,List<Pepople>>();

            var contractEntity = Mapper.Map<Pepople>(viewModel);
            var people = Mapper.Map<Pepople>(viewModel.selectItem);

            var data1 = Mapper.Map<Demo>(viewModel.data1);
            var list = Mapper.Map<List<Pepople>>(viewModel.PeopleList);

            if (people==null ||people.IsCreated)
            {
                LoadDatas.Add(new Pepople { ID = LoadDatas.Count + 1, Name = people.Name });
            }
            else
            {
                LoadDatas.Where(r => r.ID == viewModel.ID).FirstOrDefault().Name = people.Name;
            }
            //return RedirectToAction("Detail");
            return View("Detail");
        }
    }
}
