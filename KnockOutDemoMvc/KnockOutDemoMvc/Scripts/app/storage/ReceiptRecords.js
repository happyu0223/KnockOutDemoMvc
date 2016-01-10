/**
 * Created by dawson.liu on 13-9-6.
 */

var GMK = GMK || {};
GMK.Storage = GMK.Storage || {};
GMK.Storage.ReceiptRecords = GMK.Storage.ReceiptRecords || {};

GMK.Storage.ReceiptRecords.start = function () {
    GMK.Features.CommonModels.onReady(function (models) {
        var action = $("#gmk-route").data("action");
        if (action == 'Import') {
            var values = $('#gmk-route').data('values') || {};
            var viewModel = new GMK.Storage.ReceiptRecords.ImportViewModel(models, {
                listUrl: 'Storage/Manage',
                saveUrl: 'Storage/SaveImportedReceipts'
            }, { values: values });
            viewModel.ExportedReceiptsElem = $('#ImportedReceipts');
            viewModel.ImportedReceipts.push([' ', ' ']);
            viewModel.ExportedReceiptsElem.handsontable({
                data: viewModel.ImportedReceipts,
                startRows: 1,
                startCols: 2,
                maxCols: 2,
                minSpareRows: 1,
                rowHeaders: true,
                colHeaders: true,
                contextMenu: true,
                stretchH: 'all',
            });
            viewModel.ExportedReceiptsElem.handsontable('getInstance').addHook('afterChange', function (changes) {
                if (!changes) return;
                $.each(changes, function (i, item) {
                    if ((!viewModel.IsSpecial() && item[1] == 1) || (viewModel.IsSpecial() && item[1] == 2)) {
                        var totalCount = viewModel.ExportedReceiptsElem.handsontable('countRows') - 2;
                        var totalAmount = 0;
                        $.each(viewModel.ImportedReceipts, function (i, elem) {
                            totalAmount += utils.parseFloat(elem[item[1]]);
                        });
                        viewModel.TotalReceipts(totalCount);
                        viewModel.TotalReceiptWeight(totalAmount);
                        return false;
                    }
                });
            });
            window.vm = viewModel;
            ko.applyBindings(viewModel);
            viewModel.initialize();
        } else {
            var viewModel = new GMK.Storage.ReceiptRecords.ListViewModel(models, {
                searchUrl: 'Storage/ListReceiptsWithTotalInfo',
                deleteUrl: 'Storage/DeleteReceipt'
            });
            ko.applyBindings(viewModel);
            viewModel.registerQueryFormEvent();
            viewModel.initialize();
        }
    });
};

GMK.Storage.ReceiptRecords.ListViewModel = function (models, options) {
    var self = $.extend(this, models);
    var base = GMK.Features.FeatureBase;

    self.paramQueried = {
        CommodityId: ko.observable()
    };
    function viewModel() {
        var vm = this;
        vm.list = ko.observableArray();
        vm.currentWeights = ko.computed(function () {
            var w = 0;
            $.each(vm.list(), function (i, item) {
                w += utils.parseFloat(item.Weight);
            });
            return w;
        });
        vm.totalCount = ko.observable();
        vm.totalWeights = ko.observable();
        vm.brands = ko.observableArray();
        vm.specifications = ko.observableArray();
        vm.accountingEntities = ko.observableArray();
        vm.selectedCommodity = ko.observable();
        vm.selectedExchange = ko.observable();
        vm.selectedCommodity.subscribe(function (id) {
            vm.brands.removeAll();
            vm.specifications.removeAll();
            vm.accountingEntities.removeAll();
            for (var i = 0; i < models.AllCommodities.length; i++) {
                var commodity = models.AllCommodities[i];
                if (commodity.id == id) {
                    //使用slice() 避免引用类型被removeAll()
                    vm.brands(commodity.brands.slice());
                    vm.specifications(commodity.specifications.slice());
                    vm.accountingEntities(commodity.accountEntities.slice());
                }
            }
        });
        vm.isSpecial = ko.observable(false);
        vm.selectedCommodity((models.UserCommodities[0] || {}).id);

        vm.fill = function (data) {
            vm.list(data.result);
            vm.totalCount(data.summary.TotalCount);
            vm.totalWeights(data.summary.TotalWeight);
            base._p(data.pagination, options.searchUrl, vm.fill);
        }
    }
    viewModel.call(this);

    function _isSpecial() {
        var measureType = ($.grep(self.AllCommodities, function (item) { return item.id == self.selectedCommodity(); })[0] || {}).measureType;
        return (self.isSpecialReceiptExchange(self.selectedExchange()) || self.isShangjinExchange(self.selectedExchange())) && (measureType == self.Enums.CommodityMeasureType.ByPiece);
    }
    self.onSearch = function () {
        self.isSpecial(_isSpecial());
        base._get(options.searchUrl, utils.serialize("#searchForm .gmk-data-field"), function (data) {
            self.paramQueried.CommodityId(self.selectedCommodity());
            self.fill(data);
        }, true);
    };

    self.onDelete = function (item, event) {
        base._delete(options.deleteUrl, { id: item.WFWarehouseStorageId }, function () {
            self.list.remove(item);
        });
    };

    self.onBatchDelete = function (item, event) {
        utils.confirm('确定批量删除同批导入的所有库存？', function () {
            base._post('Storage/BatchDelete', { id: item.WFWarehouseStorageId }, function (result) {
                self.onSearch();
            });
        });
    };

    self.initialize = function () {
        self.onSearch();
    };

    self.batch = {};
    self.batch.loaded = ko.observable(false);
    self.batch.Commodities = models.UserCommodities;
    self.batch.Commodity = ko.computed(function () {
        return self.batch.loaded() && utils.find(models.AllCommodities, function (r) {
            return self.batch.item.CommodityId() === r.id;
        });
    });
    self.batch.AccountingEntity = ko.computed(function () {
        return self.batch.loaded() && utils.find(models.AccountingEntities, function (r) {
            return self.batch.item.AccountEntityId() === r.id;
        });
    });
    self.batch.toEdit = function (item) {
        if (!self.batch.loaded()) {
            self.batch.item = ko.mapping.fromJS(item);
            self.batch.loaded(true);
        } else {
            ko.mapping.fromJS(item, self.batch.item);
        }
    };
    self.batch.onSave = function () {
        utils.confirm('确定修改？', function () {
            base._post('Storage/BatchUpdate', ko.mapping.toJS(self.batch.item), function (result) {
                self.onSearch();
                $('#modalBatchEdit').modal('hide');
            });
        });
    };
}

GMK.Storage.ReceiptRecords.ImportViewModel = function (models, options, route) {
    var self = $.extend(this, models);
    var base = GMK.Features.FeatureBase;

    function viewModel() {
        var vm = this;
        vm.searchForCardCode = ko.observable();
        vm.searchForCardCode.subscribe(function (val) {
            $.each(vm.list(), function (i, item) { item.isVisible(item.StorageCode.indexOf(val) > -1) });
        });
        vm.AccountingEntities = ko.observableArray();
        vm.selectedAccountingEntity = ko.observable();
        vm.selectedAccountingEntity.subscribe(function (newVal) {
            if (!newVal) {
                vm.FilteredSalers([]);
                return;
            }
            vm.FilteredSalers($.grep(vm.AccountingEntities(), function (item) {
                return item.id == newVal;
            })[0].salers);
        });
        vm.list = ko.observableArray();
        vm.selectedItems = ko.observable(0);
        vm.totalWeightForSelectedReceipts = ko.computed(function () {
            var result = 0, amount = 0;
            $.each(vm.list(), function (i, item) {
                if (item.isSelected() && item.isVisible()) {
                    result += parseFloat(item.Weight);
                    amount++;
                }
            });
            vm.selectedItems(amount);
            return result.toFixed(2);
        });

        vm.FilteredSalers = ko.observableArray();

        vm.Commodity = ko.observable();
        vm.MeasureType = ko.observable();
        vm.Commodity.subscribe(function (newVal) {
            vm.Brands.removeAll();
            vm.Specifications.removeAll();
            $.each(vm.AllCommodities, function (i, item) {
                if (item.id == newVal) {
                    vm.MeasureType(item.measureType);
                    vm.Brands(item.brands.slice(0));
                    vm.Specifications(item.specifications.slice(0));
                    vm.AccountingEntities(item.accountEntities.slice(0));
                    return false;
                }
            });
        });

        vm.Brands = ko.observableArray();
        vm.Brand = ko.observable();
        vm.Specifications = ko.observableArray();
        vm.Specification = ko.observable();
        vm.Exchange = ko.observable();
        vm.Warehouse = ko.observable();
        vm.TotalReceipts = ko.observable(0);
        vm.TotalReceiptWeight = ko.observable(0);
        vm.ImportedReceipts = [['仓单号', '重量']];
        vm.IsSpecial = ko.computed(function () {
            return (vm.isSpecialReceiptExchange(vm.Exchange()) || vm.isShangjinExchange(vm.Exchange())) && vm.MeasureType() == vm.Enums.CommodityMeasureType.ByPiece;
        });
        vm.IsSpecial.subscribe(function (newVal) {
            if (newVal) {
                if (!_.isEqual(vm.ImportedReceipts[0], ['凭证号', '码单', '重量'])) {
                    vm.ImportedReceipts = [['凭证号', '码单', '重量'], [' ', ' ', '']];
                    vm.ExportedReceiptsElem.handsontable({
                        data: vm.ImportedReceipts,
                        startRows: 1,
                        startCols: 3,
                        maxCols: 3,
                        minSpareRows: 1,
                        rowHeaders: true,
                        colHeaders: true,
                        contextMenu: true
                    });
                }
            } else {
                if (!_.isEqual(vm.ImportedReceipts[0], ['仓单号', '重量'])) {
                    vm.ImportedReceipts = [['仓单号', '重量'], [' ', '']];
                    vm.ExportedReceiptsElem.handsontable({
                        data: vm.ImportedReceipts,
                        startRows: 1,
                        startCols: 2,
                        maxCols: 2,
                        minSpareRows: 1,
                        rowHeaders: true,
                        colHeaders: true,
                        contextMenu: true
                    });
                }
            }
        });

        vm.SalerId = ko.observable();
        vm.fill = function (data) {
            $.each(data, function (i, item) {
                item.isSelected = ko.observable(true);
                item.isVisible = ko.observable(true);
            });
            vm.list(data);
        }
    }

    viewModel.call(this);

    self.onSave = function () {
        base._save(options.saveUrl, {
            datas: self.ImportedReceipts,
            summary: {
                CommodityId: self.Commodity(),
                BrandId: self.Brand(),
                SpecificationId: self.Specification(),
                WarehouseId: self.Warehouse(),
                ExchangeId: self.Exchange(),
                SalerId: self.SalerId(),
                AccountEntityId: self.selectedAccountingEntity(),
            }
        });
    };

    self.initialize = function () {
        self.Commodity(route.values.CommodityId);
        self.Brand(route.values.BrandId);
        self.Specification(route.values.SpecificationId);
        self.Warehouse(route.values.WarehouseId);
        self.Exchange(route.values.ExchangeId);
    }
}

$(document).ready(function () {
    GMK.Storage.ReceiptRecords.start();
});
