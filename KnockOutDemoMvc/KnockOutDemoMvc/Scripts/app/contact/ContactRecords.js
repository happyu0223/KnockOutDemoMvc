/**
 * Created by amy on 2015-01-26.
 */

var GMK = GMK || {};
GMK.Contact = GMK.Contact || {};
GMK.Contact.ContactRecords = GMK.Contact.ContactRecords || {};

GMK.Contact.ContactRecords.start = function (viewRoute) {
    var $routeElem = $("#gmk-route"), route = {
        baseUrl: 'Contact/',
        action: $routeElem.data("action"),
        key: $routeElem.data("key")
    };
    GMK.Features.CommonModels.onReady(function (models) {
        if (route.action == 'List') {
            if (viewRoute) {
                var viewModel = new GMK.Contact.ContactRecords.ListViewModel(models, viewRoute, {
                    searchUrl: route.baseUrl + 'ListContactRecords',
                    deleteUrl: route.baseUrl + 'DeleteContact',
                    detailsUrl: route.baseUrl + 'GetContact'
                });
                viewModel.initialize();
                ko.applyBindings(viewModel);
                viewModel.registerQueryFormEvent();
                ko.utils.InlineEditorInitialize(viewModel.onInlineEditorSave);
            }
        } else if (route.action == "Details") {
            if (viewRoute) {
                var viewModel = new GMK.Contact.ContactRecords.DetailsViewModel(models, viewRoute,
                    {});
                viewModel.initialize();
                ko.applyBindings(viewModel);
            }
        } else if (route.action == "Create") {
            if (viewRoute) {
                var viewModel = new GMK.Contact.ContactRecords.ManageViewModel(models, viewRoute,
                    {
                        saveUrl: route.baseUrl + "SaveContact",
                    });
                viewModel.initialize();
                ko.applyBindings(viewModel);
            }
        }
    });
};

GMK.Contact.ContactRecords.ListViewModel = function (models, route, options) {
    var self = $.extend(this, models);
    var base = GMK.Features.FeatureBase;

    self.paramToQuery = ko.mapping.fromJS(route.values.query);
    self.paramQueryed = ko.observable();
    self.companyList = ko.observableArray(route.companyList);
    self.resultPagination = ko.mapping.fromJS({ TotalCount: 0, PageCount: 1 });
    self.typeOptions = $.grep(models.EnumOptions.CorporationTypeFlag, function (r) {
        return $.inArray(r.text, ['贸易公司', '经纪公司', '物流公司', '银行', '交易所']) > -1;
    });
    function viewModel() {
        var vm = this;
        vm.list = ko.observableArray();
        vm.fill = function (result) {
            vm.list.removeAll();
            for (var i = 0; i < result.Data.list.length; i++) {
                vm.list.push($.extend(result.Data.list[i], {
                    groupedDetails: ko.observableArray(),
                    isShown: ko.observable(false)
                }));
            }

            base._pagination($("#pager"), +vm.resultPagination.PageCount(), +vm.resultPagination.TotalCount(), +vm.paramQueryed().Pagination.CurrentPage, self.changePage, +result.Data.pagination.PageSize);
        };
    }
    viewModel.call(this);

    self.changePage = function (newPage, pageSize) {
        var params = self.paramQueryed();
        var currPageSize = +self.paramToQuery.Pagination.PageSize();
        var newPageSize = +pageSize || +params.Pagination.PageSize;
        params.Pagination.PageSize = newPageSize;
        self.paramToQuery.Pagination.PageSize(newPageSize);
        params.Pagination.CurrentPage = newPageSize === currPageSize ? +newPage || +params.Pagination.CurrentPage : 1;
        _search(params);
    };

    function _search(param) {
        base._get(options.searchUrl, param, function (result) {
            param.Pagination.CurrentPage = result.Data.pagination.CurrentPage;
            self.paramQueryed(param);
            self.resultPagination.TotalCount(result.Data.pagination.TotalCount);
            self.resultPagination.PageCount(result.Data.pagination.PageCount);
            var urlParam = self.paramQueryed();
            utils.cleanEmpty(urlParam);
            history.replaceState(null, null, location.pathname + '?' + $.param(urlParam));

            self.fill(result);
        });
    };

    self.onSearch = function () {
        self.paramToQuery.Pagination.CurrentPage(1);
        var param = ko.mapping.toJS(self.paramToQuery);
        _search(param);
    };

    self.onDelete = function (item, event) {
        base._delete(options.deleteUrl, { id: item.WFContactId }, function () {
            var param = ko.mapping.toJS(self.paramToQuery);
            _search(param);
        });
    };

    self.initialize = function () {
        var param = ko.mapping.toJS(self.paramToQuery);
        _search(param);
    };
}

GMK.Contact.ContactRecords.DetailsViewModel = function (models, route, options) {
    var self = $.extend(this, models);
    var base = GMK.Features.FeatureBase;

    function viewModel() {
        var vm = this;
        route.data.selectedAccountEntities = route.data.WFContactCommodityAccountEntities ? $.map(route.data.WFContactCommodityAccountEntities, function (item) {
            var business = models.findById(models.AllBusinesses, item.WFBusinessId);
            return business != null ? business.text : "";
        }).join('； ') : '';
        vm.item = ko.mapping.fromJS(route.data || {});
    }
    viewModel.call(this);

    self.initialize = function () {
    };
}

GMK.Contact.ContactRecords.ManageViewModel = function (models, route, options) {
    var self = $.extend(this, models);
    var base = GMK.Features.FeatureBase;

    self.companyList = ko.observableArray();
    
    function viewModel() {
        var vm = this;
        route.data.selectedAccountEntities = route.data.WFContactCommodityAccountEntities ? $.map(route.data.WFContactCommodityAccountEntities, function (item) {
            return item.WFBusinessId;
        }) : [];
        vm.contactModel = ko.mapping.fromJS(route.data || {});
        vm.companyEditable = true;
        if (route.companyId > -1) {
            vm.contactModel.WFCompanyId(route.companyId);
            vm.companyEditable = false;
        }
    }
    viewModel.call(this);

    self.save = function (callback) {
        var param = ko.mapping.toJS(self.contactModel);
        param.selectedAccountEntities = $.grep(param.selectedAccountEntities, function (item) {
            return !!item;
        });
        if (param.selectedAccountEntities) {
            param.WFContactCommodityAccountEntities = $.map(param.selectedAccountEntities, function (item) {
                return {
                    WFBusinessId: item,
                    WFContactId: param.WFContactId,
                    WFBusiness: {
                        WFBusinessId: item,
                    },
                    WFContact: {
                        WFContactId: param.WFContactId,
                    }
                };
            });
        }
        base._post(options.saveUrl, param, function (result) {
            if (callback) {
                callback(result);
            }
        });
    };
    self.back = base._back;
    self.onSave = function (callback) {
        self.save(self.back);
    };

    self.invalids = {
        contact: ko.observable(0)
    };
    self.customShowErrors = ko.observable();
    utils.setCustomShowErrors(self.customShowErrors);
    self.setCustomShowErrors = {
        contact: function () { self.customShowErrors(self.invalids.contact); }
    }

    self.initialize = function () {
        jQuery.validator.addMethod("isIdCardNo", function (value, element) {
            return this.optional(element) || isIdCardNo(value);
        }, "请输入正确的身份证号码");

        $("#contactForm").validate({
            rules: {
                IdCode: {    
                    isIdCardNo: true
                }
            },
        });

        self.companyList(route.companyList);
        self.jstreeModel.initialize();
    };

    self.jstreeModel = new JsTree.Business.Model(models, "jstree_div");
    self.jstOnShow = function () {
        return self.jstreeModel.onShow(self.contactModel.selectedAccountEntities());
    };
    self.jstOnSave = function () {
        self.jstreeModel.onSave(function () {
            self.contactModel.selectedAccountEntities(self.jstreeModel.newSelectIds());
        });
    };
    self.jstOnCancel = function () {
        self.jstreeModel.onCancel();
    };
}

function isIdCardNo(num) {
    var reg = /(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/;  
    if (reg.test(num) === true) {
        return true;
    }
}