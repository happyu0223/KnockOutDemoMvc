
var GMK = GMK || {};
GMK.CostRecord = GMK.CostRecord || {};
GMK.CostRecord.start = function (route, element, success) {
    GMK.Features.CommonModels.onReady(function (commonModels) {
        if (route.action === 'Records') {
            var viewModel = new GMK.CostRecord.IndexViewModel(commonModels, route, {
                searchUrl: 'CostManagement/ListRecords',
                deleteUrl: 'CostManagement/DeleteRecord'
            });
            viewModel.initialize(function () {
                ko.applyBindings(viewModel, element);
                viewModel.commonModels.registerQueryFormEvent();
                if (success) {
                    success(viewModel);
                }
            });
        } else if (route.action === 'CreateRecord' || route.action === 'EditRecord') {
            var viewModel = new GMK.CostRecord.ManageViewModel(commonModels, route, {
                getUrl: 'CostManagement/GetRecord',
                listUrl: 'CostManagement/Records',
                saveUrl: 'CostManagement/SaveRecord'
            });
            viewModel.initialize(function () {
                ko.applyBindings(viewModel, element);
                if (success) {
                    success(viewModel);
                }
            });
        }
    });
};

GMK.CostRecord.IndexViewModel = function (commonModels, route, options) {
    var self = this;
    self.commonModels = commonModels;
    var base = GMK.Features.FeatureBase;
    self.items = ko.observableArray();
    self.query = ko.mapping.fromJS(route.values.query);
    self.currQuery = ko.mapping.toJS(self.query);
    self.customers = self.currQuery.CostFeeType === commonModels.Enums.CostFeeType.WarehouseFee ? commonModels._AllWarehouses : commonModels._AllLogistics;
    self.sumAmount = ko.computed(function () {
        var sum = 0;
        $.each(self.items(), function (i, r) {
            sum = utils.roundAmount(sum + utils.roundAmount(r.Amount()));
        });
        return sum;
    });
    self.fillItems = function (result) {
        self.query.Pagination = result.Data.pagination;
        self.currQuery.Pagination = result.Data.pagination;
        self.items.removeAll();
        $.each(result.Data.list, function (i, r) {
            self.items.push(ko.mapping.fromJS(r));
        });
        base._paginate($(route.values.pager), result.Data.pagination, function () { return self.currQuery; }, options.searchUrl, self.fillItems);
    };
    self.search = function (query, callback) {
        base._post(options.searchUrl, query, function (result) {
            self.fillItems(result);
            if (callback) {
                callback();
            }
        });
    };
    self.onSearch = function () {
        self.currQuery = ko.mapping.toJS(self.query);
        self.search(self.currQuery);
    };
    self.initialize = function (callback) {
        self.currQuery = ko.mapping.toJS(self.query);
        self.search(self.currQuery, callback);
    };
    self.onDelete = function (item) {
        confirm('确定要删除？', function () {
            base._post(options.deleteUrl, {
                id: item.WFCostPayRecordId()
            }, function (result) {
                self.items.remove(item);
            });
        });
    };
};

GMK.CostRecord.ManageViewModel = function (commonModels, route, options) {
    var self = this;
    self.commonModels = commonModels;
    var base = GMK.Features.FeatureBase;
    self.isCreate = route.action === 'CreateRecord';
    self.costFeeType = route.values.costFeeType;
    self.id = route.values.id;
    self.customers = self.costFeeType === commonModels.Enums.CostFeeType.WarehouseFee ? commonModels._AllWarehouses : commonModels._AllLogistics;
    self.fillItem = function (data) {
        self.item = ko.mapping.fromJS(data);
        self.accounts = ko.computed(function () {
            return (utils.find(self.customers, function (r) {
                return r.id == self.item.CustomerId();
            }) || {}).accounts || [];
        });
        self.selectedAccount = ko.computed(function () {
            return utils.find(self.accounts(), function (r) {
                return r.id == self.item.CompanyBankInfoId();
            });
        });
    };
    self.initialize = function (callback) {
        if (self.isCreate) {
            self.fillItem(route.values.item);
            if (callback) {
                callback();
            }
        } else {
            base._get(options.getUrl, { id: self.id }, function (result) {
                self.fillItem(result.Data);
                if (callback) {
                    callback();
                }
            });
        }
    };
    self.onSave = function () {
        var data = ko.mapping.toJS(self.item);
        base._postThenBack(options.saveUrl, data);
    };
};
