var GMK = GMK || {};
GMK.CostManagement = GMK.CostManagement || {};
GMK.CostManagement.Requests = GMK.CostManagement.Requests || {};

GMK.CostManagement.Requests.start = function (data) {
    var $routeElem = $("#gmk-route"), route = {
        baseUrl: 'CostManagement/',
        action: $routeElem.data("action"),
        key: $routeElem.data("key"),
        costFeeType: $routeElem.data('costfeetype')
    };
    GMK.Features.CommonModels.onReady(function (models) {
        if (route.action == 'Manage') {
            if (route.key) {
                var viewModel = new GMK.CostManagement.Requests.EditViewModel(models, {
                    saveUrl: route.baseUrl + 'SaveFeeRequest',
                    loadUrl: route.baseUrl + 'GetFeeRequest',
                    loadKey: route.key || '0',
                    costFeeType: route.costFeeType
                });
                viewModel.initialize();
                ko.applyBindings(viewModel);
            } else {
                var viewModel = new GMK.CostManagement.Requests.CreateViewModel(models, {
                    saveUrl: route.baseUrl + 'SaveFeeRequest',
                    costFeeType: route.costFeeType,
                    archiveIndexUrl: data.archiveIndexUrl
                });
                ko.applyBindings(viewModel);
            }
        } else if (route.action == 'Details') {
            var viewModel = new GMK.CostManagement.Requests.DetailsViewModel(models, {
                loadUrl: route.baseUrl + 'GetFeeRequest',
                loadKey: route.key || '0',
                costFeeType: route.costFeeType
            });
            viewModel.initialize();
            ko.applyBindings(viewModel);
        } else {
            var viewModel = new GMK.CostManagement.Requests.ListViewModel(models, {
                searchUrl: route.baseUrl + 'ListFeeRequests',
                deleteUrl: route.baseUrl + 'DeleteFeeRequest',
                costFeeType: route.costFeeType
            });
            ko.applyBindings(viewModel);
            viewModel.registerQueryFormEvent();
            function initialize(query) {
                query = $.extend({}, viewModel.defaultQuery, query);
                ko.mapping.fromJS(query, viewModel.query);
                viewModel.initialize(query);
            }
            initialize(models.getQuery());
            models.registerStateChange(function (data) {
                initialize(data);
            });
        }
    });
};

GMK.CostManagement.Requests.ListViewModel = function (models, options) {
    var self = $.extend(this, models);
    var base = GMK.Features.FeatureBase;
    self.customers = options.costFeeType == models.Enums.CostFeeType.Logistics ? self._AllLogistics : self._AllWarehouses;
    self.costFeeType = options.costFeeType;
    self.customerCaption = options.costFeeType === models.Enums.CostFeeType.Logistics ? '物流公司' : '仓库';
    var oldFindBank = self.findBank;
    self.findBank = function (id, customerId) {
        var customer, name = '';
        $.each(self.customers, function (i, item) {
            if (item.id == customerId) {
                customer = item;
                return false;
            }
        });
        return self.findById(customer.accounts, id);
    };
    function viewModel() {
        var vm = this;
        function constructQuery() {
            var query = {
                CommodityId: ko.observable(),
                CustomerId: ko.observable(),
                AccountingEntityId: ko.observable(),
                DateRange: ko.observable(),
                CostFeeType: ko.observable(options.costFeeType)
            };
            query['__ko_mapping__'] = {
                include: ['CommodityId', 'CustomerId', 'AccountingEntityId', 'AateRange', 'DateRange', 'CostFeeType'],
                ignore: ['Pagination']
            };
            return query;
        }
        vm.defaultQuery = {
            CommodityId: null,
            CustomerId: null,
            AccountingEntityId: null,
            DateRange: null,
            CostFeeType: null
        };
        vm.query = constructQuery();
        vm.requests = ko.observableArray();
        vm.totalAmount = ko.computed(function () {
            var amount = 0;
            $.each(vm.requests(), function (i, item) {
                amount += utils.parseFloat(item.Amount);
            });
            return amount;
        });
    }
    viewModel.call(self);
    function fill(data) {
        self.requests(data.Data.result);
        base._paginate($('#gmk-pager'), data.Data.pagination, function () {
            return ko.mapping.toJS(self.query);
        }, options.searchUrl, fill);
    };
    self.initialize = function (query) {
        base._get(options.searchUrl, query, fill);
    };
    self.onSearch = function () {
        utils.responseStateChange(false);
        base._get(options.searchUrl, ko.mapping.toJS(self.query), fill);
    }
    self.onDelete = function (item, event) {
        base._delete(options.deleteUrl, { id: item.WFCostPayRequestId, costFeeType: self.query.CostFeeType() }, function () {
            self.requests.remove(item);
            utils.formatDecimal();
        });
    }
}

GMK.CostManagement.Requests.CreateViewModel = function (models, options) {
    var self = $.extend(this, models);
    var base = GMK.Features.FeatureBase;
    self.model = constructViewModel();
    self.costFeeType = options.costFeeType;
    function constructViewModel() {
        return {
            customer: ko.observable(),
            accountId: ko.observable(),
            amount: ko.observable(),
            payType: ko.observable(),
            commodity: ko.observable(),
            accountingEntityId: ko.observable(),
            payPurpose: ko.observable(),
            note: ko.observable()
        }
    }
    self.customers = self.costFeeType == models.Enums.CostFeeType.Logistics ? self._AllLogistics : self._AllWarehouses;
    self.selectedCustomer = null;
    self.model.customer.subscribe(function (newVal) {
        for (var i = 0, data = self.customers, length = data.length; i < length; i++) {
            if (data[i].id == newVal) {
                self.selectedCustomer = data[i];
                self.accounts(self.selectedCustomer.accounts);
                break;
            }
        }
        for (var i = 0, data = self.accounts(), length = data.length; i < length; i++) {
            if (data[i].type == 1) {
                self.model.accountId(data[i].id);
                break;
            }
        }
    });
    self.model.accountId.subscribe(function (newVal) {
        for (var i = 0, data = self.accounts(), length = data.length; i < length; i++) {
            if (data[i].id == newVal) {
                self.selectedBank(data[i].bank);
                self.selectedAddress(data[i].address);
                break;
            }
        }
    });

    function toJS() {
        return {
            WFCostPayRequestId: self.model.WFCostPayRequestId || 0,
            PayCustomerId: self.model.customer(),
            CompanyBankInfoId: self.model.accountId(),
            PayPurpose: self.model.payPurpose(),
            Amount: self.model.amount(),
            PayType: self.model.payType(),
            Note: self.model.note(),
            CommodityId: self.model.commodity(),
            AccountingEntityId: self.model.accountingEntityId(),
            CostType: self.costFeeType
        };
    }

    self.accounts = ko.observableArray();
    self.selectedBank = ko.observable();
    self.selectedAddress = ko.observable();
    self.onSave = function () {
        base._postThenBack(options.saveUrl, toJS());
    };
    self.onSaveAndPrint = function () {
        var win = utils.openWindow();
        base._post(options.saveUrl, toJS(), function (result) {
            var printUrl = location.href = options.archiveIndexUrl + '?' + $.param({
                templateType: models.Enums.BillTemplateType.Reimbursement,
                dataSourceId: result.Data.WFCostPayRequestId
            });
            win.redirectTo(printUrl);
            History.back();
        }, false);
    };
}

GMK.CostManagement.Requests.EditViewModel = function (models, options) {
    var self = this, base = GMK.Features.FeatureBase;
    GMK.CostManagement.Requests.CreateViewModel.call(self, models, options);
    self.initialize = function () {
        base._get(options.loadUrl, { id: options.loadKey, costFeeType: options.costFeeType }, function (data) {
            data = data.Data;
            self.model.WFCostPayRequestId = data.WFCostPayRequestId;
            self.model.customer(data.PayCustomerId);
            self.model.accountId(data.CompanyBankInfoId);
            self.model.payPurpose(data.PayPurpose);
            self.model.amount(data.Amount);
            self.model.payType(data.PayType);
            self.model.note(data.Note);
            self.model.commodity(data.CommodityId);
            self.model.accountingEntityId(data.AccountingEntityId);
        });
    }
}

GMK.CostManagement.Requests.DetailsViewModel = function (models, options) {
    GMK.CostManagement.Requests.EditViewModel.call(this, models, options);
    delete this.onSave;
}

