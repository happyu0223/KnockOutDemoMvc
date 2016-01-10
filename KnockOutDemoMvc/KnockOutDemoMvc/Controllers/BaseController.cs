using AutoMapper;
using AutoMapper.Internal;
using AutoMapper.Mappers;
using Newtonsoft.Json;
using Newtonsoft.Json.Serialization;
using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using System.Web;
using System.Web.Mvc;

namespace KnockOutDemoMvc
{
    //提供所有接口对象
    public class ManagersProvider
    {
        //private IOtherBillManager _OtherBillManager;
        //public IOtherBillManager OtherBillManager
        //{
        //    get
        //    {
        //        if (_OtherBillManager == null) _OtherBillManager = new BusinessLayer.OtherBillManager(UserInfo);
        //        return _OtherBillManager;
        //    }
        //}
        public ManagersProvider()
        {
        }
    }
    public class BaseController : Controller
        {

            public BaseController() : base()
            {
                AnonymousManagersProvider = new ManagersProvider();

                IPlatformSpecificMapperRegistry platformSpecificRegistry = PlatformAdapter.Resolve<IPlatformSpecificMapperRegistry>(true);
                platformSpecificRegistry.Initialize();
                var store = new ConfigurationStore(new TypeMapFactory(), MapperRegistry.Mappers);
                _mapper = new MappingEngine(store);

            }

            protected override void OnActionExecuting(ActionExecutingContext filterContext)
            {
                base.OnActionExecuting(filterContext);
            }

            protected override void OnAuthorization(AuthorizationContext filterContext)
            {
                base.OnAuthorization(filterContext);        
            }

            protected override void OnException(ExceptionContext filterContext)
            {
                base.OnException(filterContext);             
            }

         
            protected override JsonResult Json(object data, string contentType, Encoding contentEncoding, JsonRequestBehavior behavior)
            {
                return new JsonNetResult { Data = data, ContentType = contentType, ContentEncoding = contentEncoding, JsonRequestBehavior = behavior };
            }

            public JsonResult JavaScriptJson(object data, JsonRequestBehavior behavior)
            {
                return new JsonNetResult { Data = data, JsonRequestBehavior = behavior, IsCamelCase = true };
            }
            protected IMappingEngine Mapper { get { return _mapper; } }
            private IMappingEngine _mapper;

            protected IConfiguration MapperConfiguration { get { return (IConfiguration)_mapper.ConfigurationProvider; } }
            public ManagersProvider AnonymousManagersProvider { get; private set; }

    }


    public class JsonNetResult : JsonResult
    {
        public bool IsCamelCase { get; set; }

        public Newtonsoft.Json.Formatting Formatting { get; set; }

        public override void ExecuteResult(ControllerContext context)
        {
            if (context == null)
            {
                throw new ArgumentNullException("context");
            }
            if ((this.JsonRequestBehavior == System.Web.Mvc.JsonRequestBehavior.DenyGet) && string.Equals(context.HttpContext.Request.HttpMethod, "GET", StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException("JSON GET is not allowed");
            }
            var response = context.HttpContext.Response;

            response.ContentType = !string.IsNullOrEmpty(ContentType) ? ContentType : "application/json";

            if (ContentEncoding != null)
            {
                response.ContentEncoding = ContentEncoding;
            }

            if (Data != null)
            {
                // If you need special handling, you can call another form of SerializeObject below
                //var serializedObject = JsonConvert.SerializeObject(Data, Settings);
                var serializedObject = Data.ToJson(formatting: Formatting, isCamalCaseDefault: IsCamelCase);
                response.Write(serializedObject);
            }
        }
    }

    public class AjaxReturnInfo : ReturnInfo
    {
        //[JsonProperty(Order = 1)]
        public override bool Status { get; set; }
        //[JsonProperty(Order = 2)]
        public override string Message { get; set; }
        //[JsonProperty(Order = 3)]
        public object Data { get; set; }

        public AjaxReturnInfo()
        {
            Status = true;
            Message = "";
        }

        public AjaxReturnInfo(ReturnInfo result)
            : this()
        {
            if (result != null)
            {
                Status = result.Status;
                Message = result.Message;
                ReturnStatus = result.ReturnStatus;
                Data = result.ExtraData;
                ExtraData = null;

                //var properties = result.GetType().GetProperties();
                //foreach (PropertyInfo pi in properties)
                //{
                //    if (pi.CanWrite)
                //    {
                //        pi.SetValue(this, pi.GetValue(result, null), null);
                //    }
                //}
            }
        }
    }
    /// <summary>
    /// 返回状态
    /// </summary>
    public enum ReturnStatus
    {
        Success = 1,

        Warning = 2,

        Fail = 4,
    }

    public class ReturnInfo
    {

        /// <summary>
        /// Status字段是最开始设计的，后来发现bool不能满足，新加了ReturnStatus的枚举
        /// 以后不推荐使用该字段，统一使用ResultStatus
        /// </summary>
        public virtual bool Status { get; set; }
        public virtual string Message { get; set; }
        public virtual object ExtraData { get; set; }

        /// <summary>
        /// 
        /// </summary>
        public virtual ReturnStatus ReturnStatus { get; set; }


        public ReturnInfo(string msg = "", ReturnStatus status = ReturnStatus.Fail)
        {
            if (string.IsNullOrEmpty(msg))
            {
                Status = true;
                this.ReturnStatus = ReturnStatus.Success;
                Message = string.Empty;
            }
            else
            {
                Status = status == ReturnStatus.Fail ? false : true;
                ReturnStatus = status;
                Message = msg;
            }
        }
    }

    public static class Extensions
    {
        public static string FormatWith(this string source, params object[] parameters)
        {
            return string.Format(CultureInfo.InvariantCulture, source, parameters);
        }

        public static string RemoveWhiteSpace(this string input)
        {
            if (string.IsNullOrEmpty(input)) throw new ArgumentNullException("input");

            return Regex.Replace(input, @"\s", "");
        }
    }

    public static class JsonExtensions
    {
        private static readonly JsonSerializerSettings defaultJsonSerializerSettings = new JsonSerializerSettings
        {
            DateFormatHandling = DateFormatHandling.IsoDateFormat,
            DateTimeZoneHandling = DateTimeZoneHandling.Local,
            ReferenceLoopHandling = ReferenceLoopHandling.Ignore,
        };

        private static readonly JsonSerializerSettings camelCaseJsonSerializerSettings = new JsonSerializerSettings
        {
            DateFormatHandling = DateFormatHandling.IsoDateFormat,
            DateTimeZoneHandling = DateTimeZoneHandling.Local,
            ReferenceLoopHandling = ReferenceLoopHandling.Ignore,
            ContractResolver = new CamelCasePropertyNamesContractResolver(),
        };

        public static string ToJson(this object data, Formatting formatting = Formatting.None, JsonSerializerSettings settings = null, bool isCamalCaseDefault = false)
        {
            return JsonConvert.SerializeObject(data, formatting, settings ?? (isCamalCaseDefault ? camelCaseJsonSerializerSettings : defaultJsonSerializerSettings));
        }

        public static string ToJavaScriptJson(this object data, Formatting formatting = Formatting.None, JsonSerializerSettings settings = null, bool isCamalCaseDefault = true)
        {
            return ToJson(data, formatting, settings, isCamalCaseDefault);
        }
    }
}
