var GMK = GMK || {};
GMK.WarehouseConfig = GMK.WarehouseConfig || {};
GMK.WarehouseConfig.start = function (route, element, success) {
    GMK.Features.CommonModels.onReady(function (commonModels) {
        if (route.action === 'Index') {
            commonModels.registerQueryFormEvent();
            var viewModel = new GMK.WarehouseConfig.IndexViewModel(commonModels, route, {});
        } else {
            var viewModel = new GMK.WarehouseConfig.ManageViewModel(commonModels, route, {});
        }
        window.vm = viewModel;
        viewModel.initialize(function () {
            ko.applyBindings(viewModel, element);
            if (success) {
                success(viewModel);
            }
        });
    });
};
GMK.WarehouseConfig.IndexViewModel = function (commonModels, route, options) {
    var self = this;
    self.commonModels = commonModels;
    self.values = route.values;
    var base = GMK.Features.FeatureBase;
    self.items = ko.observableArray();
    self.toquery = ko.mapping.fromJS(route.values.query);
    self.queried = ko.observable({});
    self.query = {};
    (function (query) {
        query.configTypes = [{
            value: route.values.typeNames.WFSystemFeeConfiguration,
            text: '费用价格'
        }, {
            value: route.values.typeNames.WFWarehouseCalculateFeeType,
            text: '计费方式'
        }];
        query.sysFeeTypes = $.grep(commonModels.AllFee, function (r) {
            return r.feeType === commonModels.Enums.CostFeeType.WarehouseFee;
        });
    })(self.query);
    self.setUrl = function (params) {
        var urlParams = utils.getCleanedEmpty(params);
        var url = location.pathname + '?' + $.param(urlParams);
        history.replaceState(null, null, url);
    };
    self.resultPagination = ko.observable({});
    self.search = function (params, callback) {
        base._get('WarehouseInfo/ConfigList', params, function (result) {
            self.queried(params);
            self.setUrl(params);
            self.fill(result);
            if (callback) {
                callback();
            }
        });
    };
    self.fill = function (result) {
        var list = $.map(result.Data.list, function (r) {
            return ko.mapping.fromJS(r);
        });
        self.items(list);
        self.resultPagination(result.Data.pagination);
        base._pagination($('#pager'), +self.resultPagination().PageCount, self.resultPagination().TotalCount, +self.queried().Pagination.CurrentPage, self.changePage, +self.resultPagination().PageSize);
    };
    self.changePage = function (newPage, pageSize) {
        var params = self.queried();
        var currPageSize = +self.toquery.Pagination.PageSize();
        var newPageSize = +pageSize || +params.Pagination.PageSize;
        params.Pagination.PageSize = newPageSize;
        self.toquery.Pagination.PageSize(newPageSize);
        params.Pagination.CurrentPage = newPageSize === currPageSize ? +newPage || +params.Pagination.CurrentPage : 1;
        self.search(params);
    };
    self.onSearch = function () {
        if (self.toquery.Pagination && self.toquery.Pagination.CurrentPage) {
            self.toquery.Pagination.CurrentPage(1);
        }
        var params = ko.mapping.toJS(self.toquery);
        self.search(params);
    };
    self.onDelete = function (item) {
        confirm('确定要删除？', function () {
            base._post('WarehouseInfo/ConfigDelete', { typeName: item.TypeName(), id: item.Id() }, function (result) {
                self.search(self.queried());
            });
        });
    };
    self.initialize = function (callback) {
        callback();
        var params = ko.mapping.toJS(self.toquery);
        self.search(params);
    };
};
GMK.WarehouseConfig.ManageViewModel = function (commonModels, route, options) {
    var self = this;
    self.commonModels = commonModels;
    self.values = route.values;
    self.action = route.action;
    var base = GMK.Features.FeatureBase;
    self.item = ko.mapping.fromJS(route.values.newItem);
    self.configIndexUrl = ko.computed(function () {
        return route.configIndexUrl + '?' + $.param({ ConfigTypeName: self.item.TypeName(), WarehouseId: self.item.WarehouseId() });
    });
    self.load = function (callback) {
        base._get('WarehouseInfo/ConfigGet', { typeName: self.item.TypeName(), id: self.item.Id() }, function (result) {
            ko.mapping.fromJS(result.Data, self.item);
            if (callback) {
                callback(result);
            }
        });
    };
    self.initialize = function (callback) {
        if (route.action === 'ConfigCreate') {
            callback();
        } else {
            self.load(function (result) {
                callback();
            });
        }
    };
    self.batch = {};
    (function (batch) {
        batch.items = ko.observableArray();
        batch.onAdd = function () {
            var item = ko.mapping.toJS(self.item);
            batch.items.push(item);
        };
        batch.onDelete = function (item) {
            batch.items.remove(item);
        };
        batch.save = function (callback) {
            var params = ko.mapping.toJS(batch.items);
            base._post('WarehouseInfo/ConfigBatchCreate', params, function (result) {
                if (callback) {
                    callback(result);
                }
            });
        };
        batch.onSave = function () {
            batch.save(function (result) {
                self.back();
            });
        };
    })(self.batch);
    self.save = function (callback) {
        var params = ko.mapping.toJS(self.item);
        base._post('WarehouseInfo/ConfigSave', params, function (result) {
            if (callback) {
                callback(result);
            }
        });
    };
    self.onSave = function () {
        self.save(function (result) {
            self.back();
        });
    };
    self.back = function () {
        history.back();
        setTimeout(function () {
            location.href = self.configIndexUrl();
        }, 0);
    };
};
