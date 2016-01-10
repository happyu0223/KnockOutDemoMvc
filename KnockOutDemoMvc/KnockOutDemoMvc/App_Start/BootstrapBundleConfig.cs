using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Optimization;

namespace KnockOutDemoMvc
{
    public class BootstrapBundleConfig
    {
        public static void RegisterBundles()
        {
            // Add @Styles.Render("~/Content/bootstrap/base") in the <head/> of your _Layout.cshtml view
            // For Bootstrap theme add @Styles.Render("~/Content/bootstrap/theme") in the <head/> of your _Layout.cshtml view
            // Add @Scripts.Render("~/bundles/bootstrap") after jQuery in your _Layout.cshtml view
            // When <compilation debug="true" />, MVC4 will render the full readable version. When set to <compilation debug="false" />, the minified version will be rendered automatically
           // BundleTable.Bundles.Add(new StyleBundle("~/content/css/base").Include("~/Content/themes/base/jquery.ui.core.css", "~/Content/themes/base/jquery.ui.theme.css", "~/Content/themes/base/jquery.ui.datepicker.css", "~/Content/plug-ins/alertify.core.css", "~/Content/plug-ins/alertify.default.css", "~/Content/bootstrap/bootstrap.min.css", "~/Content/bootstrap/bootstrap-responsive.min.css", "~/Content/plug-ins/bootstrap-modal.css"));
            //  BundleTable.Bundles.Add(new StyleBundle("~/content/css/custom").Include("~/Content/font-awesome/font-awesome.css", "~/Content/media.css", "~/Content/plugins.css", "~/Content/plug-ins/jquery-paginate.css", "~/Content/plug-ins/select2.css", "~/Content/plug-ins/select2-bootstrap.css", "~/Content/plug-ins/typeahead.js-bootstrap.css", "~/Content/style.css", "~/Content/main.css"));

         //   BundleTable.Bundles.Add(new StyleBundle("~/content/css/custom").Include("~/Content/font-awesome/font-awesome.css", "~/Content/media.css", "~/Content/plugins.css", "~/Content/plug-ins/jquery-paginate.css", "~/Content/plug-ins/typeahead.js-bootstrap.css", "~/Content/style.css", "~/Content/main.css"));
            BundleTable.Bundles.Add(new ScriptBundle("~/bundles/scripts/base").Include("~/Scripts/jquery-2.0.3.js", "~/Scripts/i18n/jquery-ui-i18n.js", "~/Scripts/alertify.js", "~/Scripts/knockout-2.3.0.debug.js", "~/Scripts/knockout.mapping-latest.debug.js", "~/Scripts/bootstrap.js", "~/Scripts/plug-ins/bootstrap-modalmanager.js", "~/Scripts/plug-ins/bootstrap-modal.js", "~/Scripts/plug-ins/typeahead.js", "~/Scripts/knockout-bootstrap.js", "~/Scripts/jquery.validate.js", "~/Scripts/i18n/jquery.validate_locale_zh-CN.js", "~/Scripts/moment-with-langs.min.js", "~/Scripts/plug-ins/purl.js", "~/Scripts/plug-ins/MathContext.js", "~/Scripts/plug-ins/BigDecimal.js", "~/Scripts/accounting.js", "~/Scripts/jquery.history.min.js", "~/Scripts/store.js", "~/Scripts/cookies.js", "~/Scripts/jquery.signalR-2.0.3.min.js"));

            //  BundleTable.Bundles.Add(new ScriptBundle("~/bundles/scripts/plugin").Include("~/Scripts/plug-ins/daterangepicker.js", "~/Scripts/plug-ins/jquery.paginate.js", "~/Scripts/select2.js", "~/Scripts/plug-ins/jquery.placeholder.js", "~/Scripts/headroom.js"));
            BundleTable.Bundles.Add(new ScriptBundle("~/bundles/scripts/plugin").Include("~/Scripts/plug-ins/daterangepicker.js", "~/Scripts/plug-ins/jquery.paginate.js", "~/Scripts/plug-ins/jquery.placeholder.js", "~/Scripts/headroom.js"));
            BundleTable.Bundles.Add(new ScriptBundle("~/bundles/scripts/custom").Include("~/Scripts/utility.js", "~/Scripts/knockout.extensions.js", "~/Scripts/plug-ins/jquery.validate.extension.js", "~/Scripts/app/FeatureBase.js", "~/Scripts/main.js"));
        }
    }
}