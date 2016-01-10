var GMK = GMK || {};
GMK.CreditRating = GMK.CreditRating || {};
GMK.CreditRating.ChangeHistories = GMK.CreditRating.ChangeHistories || {};

GMK.CreditRating.ChangeHistories.start = function () {
    GMK.Features.CommonModels.onReady(function (models) {
        var viewModel = new GMK.CreditRating.ChangeHistories.IndexViewModel(models, {
            id: $('#gmk-route').data('id'),
        }, {
            listUrl: 'CreditRating/GetChangeHistories'
        });
        // ko.applyBindings(viewModel);
        viewModel.initialize();
    });
}

GMK.CreditRating.ChangeHistories.IndexViewModel = function (models, data, actions) {
    var self = this, base = GMK.Features.FeatureBase;

    var creditType = models.Enums.CreditRatingDetailType;
    var corporationType = models.Enums.CorporationTypeFlag;

    self.initialize = function () {
        base._get(actions.listUrl, { id: data.id }, function (result) {
            function loadTimeline() {
                var list = initData(result.Data.data, result.Data.company);

                $('.timeline').verticalTimeline({ data: list, width: '80%', groupFunction: 'groupSegmentByYear', defaultDirection: 'oldest' });
            }
            $(window).resize(function () {
                loadTimeline();
            });
            loadTimeline();
        });
    };

    function initData(list, curCompany) {
        var result = [];

        $.each(list, function (i, item) {
            var title = "";
            var body = "";
            var url = "Company/CreditModificationDetail?modificationId=" + item.ModificationId + "&companyId=" + curCompany.WFCompanyId;
            var isGroup = (curCompany.Type & corporationType.Group);
            var detailInfos = item.DetailedInfoes;

            for (var s in item) {
                item[s] = item[s] || "";
            }

            //修改信用组
            if (item.ModificationDetailType == creditType.Group) {
                var group = $.grep(detailInfos, function (detail,j) {
                    return detail.ModificationDetailId == item.MaxDetailTypeDetailId;
                });

                if (group.length != 0) {
                    title = "调整<a href='" + url + "'>" + group[0].CompanyName + "</a>的" + (group[0].IsBuy?'采购':'销售') + "信用等级为" + group[0].NewDisplayValue;
                }
                else {
                    title = "调整<a href='" + url + "'>信用组信用等级</a>";
                }

                body = initBody(item, isGroup);
            }
            else if (item.ModificationDetailType == creditType.Company) //修改客户
            {
                var company = $.grep(detailInfos, function (detail, j) {
                    return detail.CreditRatingDetailType == creditType.Company;
                });
                //信用组下修改多个客户
                if (company.length > 1 && isGroup) {
                    title = "调整<a href='" + url + "'>多个客户</a>";
                    body = initBody(item, isGroup);
                }
                else {
                    var singleCompany = $.grep(detailInfos, function (detail, j) {
                        return detail.ModificationDetailId == item.MaxDetailTypeDetailId;
                    });
                    if (singleCompany.length != 0) {
                        title = "调整<a href='" + url + "'>" + singleCompany[0].CompanyName + "</a>的" + (singleCompany[0].IsBuy ? '采购' : '销售') + "信用等级为" + singleCompany[0].NewDisplayValue;
                    }
                    else {
                        title = "调整<a href='" + url + "'>公司信用等级</a>";
                    }
                    //单个公司，详情里面直接显示品种
                    body = initBody(item, isGroup);
                }
            }
            else {
                var commodity = $.grep(detailInfos, function (detail, j) {
                    return detail.CreditRatingDetailType == creditType.Commodity;
                });
                //多个品种
                if (commodity.length > 1) {
                    title = "调整<a href='" + url + "'>多个品种</a>";
                    body = initBody(item, isGroup);
                }
                else {//单个品种
                    if (commodity.length != 0) {
                        if (!isGroup)
                            title = "调整<a href='" + url + "'>" + commodity[0].CommodityName + "</a>的" + (commodity[0].IsBuy ? '采购' : '销售') + "信用等级为" + commodity[0].NewDisplayValue;
                        else
                            title = "调整<a href='" + url + "'>" + commodity[0].CompanyName + "-" + commodity[0].CommodityName + "</a>的" + (commodity[0].IsBuy ? '采购' : '销售') + "信用等级为" +
                                commodity[0].NewDisplayValue;
                    }
                    else
                        title = "<a href='" + url + "'>调整品种信用等级</a>";

                    body += "申请人：" + item.Creator + "\n";
                    body += "备注：" + item.Note;
                }
            }
            result.push({
                title: title,
                date: formatDate(item.ApprovedTime, "yyyy-MM-dd"),
                displaydate: formatDate(item.ApprovedTime, "MM月dd日"),
                body: body
            });

        });

        return result;
    }

    function initBody(item, isGroup) {
        var body = "";
        
        if (item.ModificationDetailType == creditType.Group) {
            $.each(item.DetailedInfoes, function (i, detail) {
                if (detail.CreditRatingDetailType == creditType.Group && detail.ModificationDetailId != item.MaxDetailTypeDetailId) {
                    body += "信用组“" + detail.CompanyName + "”的" + (detail.IsBuy ? '采购' : '销售') + "评级调整为“" + detail.NewDisplayValue + "”\n";
                } else if (detail.CreditRatingDetailType == creditType.Company) {
                    body += "客户“" + detail.CompanyName + "”的" + (detail.IsBuy ? '采购' : '销售') + "评级调整为“" + detail.NewDisplayValue + "”\n";
                }
                else if (detail.CreditRatingDetailType == creditType.Commodity) {
                    body += "客户“" + detail.CompanyName + "”的品种“" + detail.CommodityName + "”的" + (detail.IsBuy ? '采购' : '销售') + "评级调整为“" + detail.NewDisplayValue + "”\n";
                }
            });
        } else if (item.ModificationDetailType == creditType.Company) {
            if (isGroup) {
                $.each(item.DetailedInfoes, function (i, detail) {
                    if (detail.CreditRatingDetailType == creditType.Company) {
                        body += "客户“" + detail.CompanyName + "”的" + (detail.IsBuy ? '采购' : '销售') + "评级调整为“" + detail.NewDisplayValue + "”\n";
                    }
                    else if (detail.CreditRatingDetailType == creditType.Commodity) {
                        body += "客户“" + detail.CompanyName + "”的品种“" + detail.CommodityName + "”的" + (detail.IsBuy ? '采购' : '销售') + "评级调整为“" + detail.NewDisplayValue + "”\n";
                    }
                });
            } else {
                $.each(item.DetailedInfoes, function (i, detail) {
                    if (detail.CreditRatingDetailType == creditType.Company && detail.ModificationDetailId != item.MaxDetailTypeDetailId) {
                        body += "客户的" + (detail.IsBuy ? '采购' : '销售') + "评级调整为“" + detail.NewDisplayValue + "”\n";
                    } else if (detail.CreditRatingDetailType == creditType.Commodity) {
                        body += "品种“" + detail.CommodityName + "”的" + (detail.IsBuy ? '采购' : '销售') + "评级调整为“" + detail.NewDisplayValue + "”\n";
                    }
                });
            }
        } else {
            $.each(item.DetailedInfoes, function (i, detail) {
                if (detail.CreditRatingDetailType == creditType.Commodity) {
                    if (isGroup)
                        body += "客户“" + detail.CompanyName + "”的品种“" + detail.CommodityName + "”的" + (detail.IsBuy ? '采购' : '销售') + "评级调整为“" + detail.NewDisplayValue + "”\n";
                    else
                        body += "品种“" + detail.CommodityName + "”的" + (detail.IsBuy ? '采购' : '销售') + "评级调整为“" + detail.NewDisplayValue + "”\n";
                }
            });
        }

        body += "申请人：" + item.Creator + "\n";
        body += "备注：" + item.Note;
        return body;
    }

    function formatDate(date, format) {
        if (!date) return;
        if (!format) format = "yyyy-MM-dd";
        date = new Date(date);

        if (!date instanceof Date) return;
        var dict = {
            "yyyy": date.getFullYear(),
            "M": date.getMonth() + 1,
            "d": date.getDate(),
            "H": date.getHours(),
            "m": date.getMinutes(),
            "s": date.getSeconds(),
            "MM": ("" + (date.getMonth() + 101)).substr(1),
            "dd": ("" + (date.getDate() + 100)).substr(1),
            "HH": ("" + (date.getHours() + 100)).substr(1),
            "mm": ("" + (date.getMinutes() + 100)).substr(1),
            "ss": ("" + (date.getSeconds() + 100)).substr(1)
        };
        return format.replace(/(yyyy|MM?|dd?|HH?|ss?|mm?)/g, function () {
            return dict[arguments[0]];
        });
    }
};

$(function () {
    GMK.CreditRating.ChangeHistories.start();
});