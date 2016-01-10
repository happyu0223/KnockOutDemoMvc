var GMK = GMK || {};
GMK.Base = GMK.Base || {};
GMK.Base.FeeConfiguration = GMK.Base.FeeConfiguration || {};
GMK.Base.FeeConfiguration.start = function () {
    GMK.Features.CommonModels.onReady(function (models) {
        var $gmkRoute = $('#gmk-route'), action = $gmkRoute.data('action');
        if (action == 'List') {
            var viewModel = new GMK.Base.FeeConfiguration.IndexViewModel(models, {
                warehouseId:$gmkRoute.data('warehouse-id')
            }, {
                listUrl: 'WarehouseInfo/ListFeeConfiguration',
                deleteUrl: 'WarehouseInfo/DeleteFeeConfiguration'
            });
            ko.applyBindings(viewModel);
            viewModel.initialize();
        } else if (action == 'Manage') {
            var key = $gmkRoute.data('key'), warehouseId = $gmkRoute.data('warehouse-id'), args = [models, {
                getUrl: 'WarehouseInfo/GetFeeConfiguration',
                batchCreateFeeConfigurationUrl:'WarehouseInfo/BatchCreateFeeConfiguration',
                saveUrl: 'WarehouseInfo/SaveFeeConfiguration',
                listFeeNamesUrl: 'WarehouseInfo/ListFeeNames'
            }];
            args.splice(1, 0, key ? { key: key } : {warehouseId : warehouseId} );
            var viewModel = GMK.Base.FeeConfiguration.ManageViewModel.apply(this, args);
            ko.applyBindings(viewModel);
            viewModel.initialize();
        }
    });
};

GMK.Base.FeeConfiguration.IndexViewModel = function(commonModels, data, actions) {
    var self = this, base = GMK.Features.FeatureBase;
    var pagination;
    self.commonModels = commonModels;
    self.query = constructQuery();
    self.query.warehouseId(data.warehouseId);

    self.list = ko.observableArray();
    self.feeTypes = ko.observableArray($.grep(commonModels.AllFee, function (item) {
        return item.feeType == 0;
    }));

    function constructQuery() {
        return {
            warehouseId: ko.observable(),
            systemFeeTypeId:ko.observable(),
            commodityId: ko.observable(),
            dateRange : ko.observable()
        };
    }
    function fill(data) {
        self.list(data.data.list);
        pagination = data.data.pagination;
        base._p(data.data.pagination, actions.listUrl, fill, function () { return ko.mapping.toJS(self.query); });
    }

    self.onSearch = function () {
        _search();
    };

    function _search(withPagination) {
        var param = ko.mapping.toJS(self.query);
        if (withPagination) param.pagination = pagination;
        base._get(actions.listUrl, param, function (data) {
            fill(data);
        });
    }

    self.onDelete = function (item) {
        base._delete(actions.deleteUrl, { id: item.wfSystemFeeConfigurationId }, function () {
            _search(true);
        });
    };

    self.initialize = self.onSearch;
};

GMK.Base.FeeConfiguration.ManageViewModel = function (commonModels, data, actions) {
    if (actions == undefined) {
        actions = data;
        data = null;
    }
    var self = this, base = GMK.Features.FeatureBase, mappingModelOpts;
    self.commonModels = commonModels;
    self.model = constructViewModel();
    mappingModelOpts = {
        include:Object.getOwnPropertyNames(self.model)
    };
    if (data.key) self.model.wfSystemFeeConfigurationId = data.key;
    self.model.wfCompanyId(data.warehouseId);
    self.currentSpecialFee = constructSpecialFee();
    self.feeTypes = ko.observableArray();

    self.batchList = ko.observableArray();

    self.initialize = function () {
        base._get(actions.listFeeNamesUrl, { feeType: 0 }, function (data) {
            self.feeTypes(data);
            if (self.model.wfSystemFeeConfigurationId) {
                base._get(actions.getUrl, { id: self.model.wfSystemFeeConfigurationId }, function (data) {
                    load(data);
                });
            }
        });
    };

    self.onAddFeeConfiguration = function () {
        var item = toJS();
        $.each(self.feeTypes(), function (i, d) {
            if (d.id == item.systemFeeTypeId) {
                item.systemFeeName = d.name;
                return false;
            }
        });
        self.batchList.push(item);
    };

    self.onDeleteFeeConfiguration = function (item) {
        self.batchList.remove(item);
    };

    self.onBatchCreate = function () {
        if (self.batchList().length == 0) {
            alert('请先添加费用配置条目');
            return;
        }
        base._postThenBack(actions.batchCreateFeeConfigurationUrl, { data: self.batchList() });
    };

    self.onSave = function () {
        base._postThenBack(actions.saveUrl, toJS());
    };

    self.onAddSpecialFee = function (item) {
        var data = ko.mapping.toJS(self.currentSpecialFee);
        if (data.specialDate) data.startDay = '';
        self.model.wfSpecialFeeConfigurations.push(data);
        resetSpecialFee(self.currentSpecialFee);
    };

    self.onDeleteSpecialFee = function (item) {
        self.model.wfSpecialFeeConfigurations.remove(item);
    };

    function toJS() {
        var result = ko.mapping.toJS(self.model);
        var splitting = result.dateRange ? result.dateRange.split(' - ') : [];
        if (splitting.length == 2) {
            result.startDate = $.trim(splitting[0]);
            result.endDate = $.trim(splitting[1]);
            delete result.dateRange;
        }
        return result;
    }

    function load(data) {
        data = data.data;
        var startDate = utils.formatDate(data.startDate), endDate = utils.formatDate(data.endDate);
        data.dateRange = startDate + ' - ' + endDate;
        delete data.startDate;
        delete data.endDate;
        data.isSpotFee = data.isSpotFee == 0 ? 'false' : (data.isSpotFee == 1 ? 'true' : '')
        ko.mapping.fromJS(data, mappingModelOpts, self.model);
    }

    function constructSpecialFee() {
        return {
            startDay: ko.observable(1),
            endDay: ko.observable(),
            specialDate: ko.observable(),
            price:ko.observable(0)
        };
    }

    function resetSpecialFee(item) {
        item.startDay(1);
        item.endDay('');
        item.specialDate('');
        item.price(0);
    }

    function constructViewModel() {
        return {
            wfSystemFeeConfigurationId: null,
            systemFeeTypeId: ko.observable(),
            dateRange: ko.observable(),
            price: ko.observable(),
            currencyId: ko.observable(),
            weightUnitId: ko.observable(),
            wfCompanyId: ko.observable(),
            wfCommodityId: ko.observable(),
            isSpotFee: ko.observable(),
            storageType: ko.observable(0),
            wfSpecialFeeConfigurations: ko.observableArray()
        };
    }
    return this;
};

$(function() {
    GMK.Base.FeeConfiguration.start();
});
