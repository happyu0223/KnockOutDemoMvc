/**
 * Created by dawson.liu on 13-10-21.
 */

var GMK = GMK || {};
GMK.Futures = GMK.Futures || {};
GMK.Futures.FuturesRecords = GMK.Futures.FuturesRecords || {};

GMK.Futures.FuturesRecords.start = function(){
    GMK.Features.CommonModels.onReady(function (models) {
        var action = $("#gmk-route").data("action"), url = $.url();
        if (action == 'Manage') {
            var viewModel = new GMK.Futures.FuturesRecords.ManageViewModel(models, {
                searchContractDetailsUrl: 'Futures/ListContractDetailInfos',
                listUrl: 'Futures/FuturesRecords',
                getUrl: 'Futures/GetFuturesRecord',
                saveUrl: 'Futures/SaveFuturesRecords',
                id: url.param('id')
            });
            viewModel.initialize();
            ko.applyBindings(viewModel);
        }
        else {
            var viewModel = new GMK.Futures.FuturesRecords.ListViewModel(models, {
                searchUrl: 'Futures/ListFuturesRecords',
                deleteUrl: 'Futures/DeleteFuturesRecord'
            });
            viewModel.initialize();
            ko.applyBindings(viewModel);
            viewModel.registerQueryFormEvent();
        }
    });
};

GMK.Futures.FuturesRecords.ListViewModel = function(models, options){
    var self = $.extend(this, models);
    var base = GMK.Features.FeatureBase;
    var pagination;
    function viewModel(){
        var vm = this;

        vm.brands = ko.observableArray();
        vm.specifications = ko.observableArray();
        vm.selectedCommodity = ko.observable();
        vm.selectedCommodity.subscribe(function (id) {
            vm.brands.removeAll();
            vm.specifications.removeAll();
            for (var i = 0; i < models.AllCommodities.length; i++) {
                var commodity = models.AllCommodities[i];
                if (commodity.id == id) {
                    for (var j = 0; j < commodity.brands.length; j++) {
                        vm.brands.push(commodity.brands[j])
                    }
                    for (var j = 0; j < commodity.specifications.length; j++) {
                        vm.specifications.push(commodity.specifications[j])
                    }
                }
            }
        });

        vm.list = ko.observableArray();
        vm.fill = function(data){
            vm.list(data.Data.result);
            pagination = data.Data.pagination;
            base._p(data.Data.pagination, options.searchUrl, vm.fill);
        }
    }
    viewModel.call(this);

    self.onSearch = function () {
        _search();
    };
    function _search(withPagination) {
        var param = utils.serialize("#searchForm .gmk-data-field");
        if (withPagination) param.pagination = pagination;
        base._get(options.searchUrl, param, function (data) {
            self.fill(data);
        }, true);
    }

    self.onDelete = function (item, event) {
        base._delete(options.deleteUrl, {id: item.WFFutureTradeRecordId}, function(){
            _search(true);
        });
    };

    self.initialize = function(){
        base._get(options.searchUrl, { commodityId: models.AllCommodities[0].id }, function(data){
            self.fill(data);
        }, true);
    }
};

GMK.Futures.FuturesRecords.ManageViewModel = function(models, options){
    var self = $.extend(this, models);
    var base = GMK.Features.FeatureBase;

    function viewModel(){
        var vm = this;

        vm.brands = ko.observableArray();
        vm.specifications = ko.observableArray();
        vm.selectedCommodity = ko.observable();
        vm.selectedCommodity.subscribe(function (id) {
            vm.brands.removeAll();
            vm.specifications.removeAll();
            for (var i = 0; i < models.AllCommodities.length; i++) {
                var commodity = models.AllCommodities[i];
                if (commodity.id == id) {
                    for (var j = 0; j < commodity.brands.length; j++) {
                        vm.brands.push(commodity.brands[j])
                    }
                    for (var j = 0; j < commodity.specifications.length; j++) {
                        vm.specifications.push(commodity.specifications[j])
                    }
                }
            }
            vm.futureRecords.removeAll();
            vm.contractDetailList.removeAll();
            vm.selectedDetailId('');
            vm.selectedContract('');
        });
        vm.Instruments = ko.computed(function () {
            return vm.selectedCommodity() ? models.findInstruments(vm.selectedCommodity()) : [];
        });

        vm.contractDetailList = ko.observableArray();
        vm.selectedDetailId = ko.observable();
        vm.selectedContract = ko.observable();

        vm.futureRecords = ko.observableArray();

        vm.isEditing = ko.observable(!!options.id);

        vm.toJson = function(){
            if(vm.isEditing()){
                var data = utils.serialize('#mainForm .gmk-data-field');
                data.WFContractDetailInfoId = vm.selectedDetailId();
                data.WFFutureTradeRecordId = options.id;
                return [data];
            }
            else{
                return vm.futureRecords();
            }
        };
        vm.fill = function(record){
            var data = record.Data, contract = record.Data.WFContractDetailInfo.WFContractInfo;
            utils.deserialize('#mainForm .gmk-data-field', data);
            utils.deserialize('#searchForm .gmk-data-field', contract);
            vm.selectedDetailId(data.WFContractDetailInfoId);
            self.selectedContract(contract.ContractCode);
        };
        vm.fillContractDetails = function(data){
            vm.contractDetailList(data.Data);
            if(data.Data && data.Data.length){
                vm.selectedDetailId(data.Data[0].WFContractDetailInfoId);
                self.selectedContract(data.Data[0].WFContractInfo.ContractCode);
            }
        };
    }
    viewModel.call(this);

    self.onSearch = function () {
        var query = utils.serialize("#searchForm .gmk-data-field");
        query.CommodityId = self.selectedCommodity();
        base._get(options.searchContractDetailsUrl, query, function(data){
            self.fillContractDetails(data);
        });
    };

    self.selectDetail = function(item, event){
        self.selectedDetailId(item.WFContractDetailInfoId);
        self.selectedContract(item.WFContractInfo.ContractCode);
        self.futureRecords.removeAll();
    };

    self.removeItem = function(item, event){
        self.futureRecords.remove(item);
    };

    self.onAdd = function(){
        var data = utils.serialize('#mainForm .gmk-data-field');
        data.WFContractDetailInfoId = self.selectedDetailId();
        self.futureRecords.push(data);
    };

    self.onSave = function () {
        base._saveThenBack(options.saveUrl, self.toJson());
    };
    self.initialize = function(){
        if(options.id){
            base._get(options.getUrl, { id: options.id }, function(record){
                var contract = record.Data.WFContractDetailInfo.WFContractInfo, query = { ContractCode: contract.ContractCode, CommodityId: contract.CommodityId }
                base._get(options.searchContractDetailsUrl, query, function(data){
                    self.fillContractDetails(data);
                    self.fill(record);
                });
            });
        }
    }
}

$(document).ready(function () {
    GMK.Futures.FuturesRecords.start();
});
