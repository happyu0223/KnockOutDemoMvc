/**
 * Created by dawson.liu on 13-10-12.
 */

var GMK = GMK || {};
GMK.Report = GMK.Report || {};
GMK.Report.ByWarehouse = GMK.Report.ByWarehouse || {};

GMK.Report.ByWarehouse.start = function () {
    GMK.Features.CommonModels.onReady(function (models) {
        var viewModel = new GMK.Report.ByWarehouse.ListViewModel(models, {
            searchUrl: 'Report/ListWarehouse',
            exportUrl: 'Report/ExportWarehouseStorageReport',
            showDetailUrl:'Report/ListWarehouseStorageReportItems'
        });
        viewModel.initialize();
        ko.applyBindings(viewModel);
        viewModel.registerQueryFormEvent();
    });
};

GMK.Report.ByWarehouse.ListViewModel = function (models, options) {
    var self = $.extend(this, models);
    var base = GMK.Features.FeatureBase;

    function viewModel() {
        var vm = this;
        vm.list = ko.observableArray();
        vm.storageDate = ko.observable();
        vm.isHistory = ko.observable();
        vm.isRemainingWeightReturnedParam = ko.observable();
        vm.isRemainingWeightReturnedParam.subscribe(function (newVal) {
            if (newVal) vm.storageDate('');
        });
        vm.isRemainingWeightReturned = ko.observable();

        vm.tradeTypes = [];
        var types = $.map(models.UserContexts, function (r) {
            return r.TradeType;
        });
        $.unique(types);
        if (types.length == 1) {
            vm.tradeTypes = $.grep(models.EnumOptions.SimpleTradeType, function (r) {
                return r.value == types[0];
            });
        } else
            vm.tradeTypes = models.EnumOptions.SimpleTradeType;

        vm.currentItem = ko.observable();

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

        var basicWeigh = {
            total: 0,
            remaining: 0,
            temphold: 0,
            pledge:0,
        };

        vm.total = {
            spot: ko.mapping.fromJS(basicWeigh),
            receipt: ko.mapping.fromJS(basicWeigh),
            warehouseReceipt: ko.mapping.fromJS(basicWeigh),
            bill: ko.mapping.fromJS(basicWeigh),
            totalWeight: ko.observable(0),
            totalRemaining:ko.observable(0),
        };

        vm.summary = {
            spot: ko.mapping.fromJS(basicWeigh),
            receipt: ko.mapping.fromJS(basicWeigh),
            warehouseReceipt: ko.mapping.fromJS(basicWeigh),
            bill: ko.mapping.fromJS(basicWeigh),
            totalWeight: ko.observable(0),
            totalRemaining: ko.observable(0),
        };

        vm.contractSummary = {
            spot: ko.mapping.fromJS(basicWeigh),
            receipt: ko.mapping.fromJS(basicWeigh),
            warehouseReceipt: ko.mapping.fromJS(basicWeigh),
            bill: ko.mapping.fromJS(basicWeigh),
            totalWeight: ko.observable(0),
            totalRemaining: ko.observable(0)
        };

        vm.contracts = ko.observableArray();
        vm.receipts = ko.observableArray();
        vm.cards = ko.observableArray();
        vm.wearhouseReceipts = ko.observableArray();
        vm.bills = ko.observableArray();

        vm.totalWeight = ko.observable(0);
        vm.totalAvailableWeight = ko.observable(0);

        vm.totalPledgeWeight = ko.observable(0);
        vm.totalUnpledgeWeight = ko.observable(0);
        vm.totalTempholdWeight = ko.observable(0);
        vm.totalSpotTempholdWeight = ko.observable(0);

        var expandingItem, $tableQueryResult = $('#tableQueryResult');
        function _initializeExpandable() {
            if ($tableQueryResult.expandable('instance')) $tableQueryResult.expandable('destroy');
            $tableQueryResult.expandable({
                toggleCallback: function (e) {
                    expandingItem = e.target;
                    vm.showDetail(vm.list()[parseInt($(e.target).closest('tr').attr('id').substr('state_'.length), 10)]);
                }
            });
        }
        vm.showDetail = function (item) {
            if (item.details().length) return;
            var param = $.extend({}, utils.serialize("#searchForm .gmk-data-field"), {WarehouseId: item.WarehouseId});
            base._get(options.showDetailUrl, param, function (data) {
                var result = data.Data.result;
                $.each(result, function (i, item) {
                    item.measureType = ko.observable((function () {
                        return ($.grep(vm.AllCommodities, function (elem) { return elem.name == item.Commodity; })[0] || {}).measureType;
                    })());
                });
                item.details(result);
                if (expandingItem) $tableQueryResult.trigger('expanded.expandable', { target: expandingItem });
                expandingItem = null;
            });
        }
        vm.fill = function (result) {
            vm.list.removeAll();
            var t1 = 0, sumSpw = 0, t2 = 0, t3 = 0, t4 = 0, t5 = 0, t6 = 0, t7 = 0, items = result.Data.result.StorageItems
            , t8 = 0, t9 = 0, t10 = 0, t11 = 0, t12 = 0, t13 = 0, t14 = 0,t15 = 0,t16 = 0, t17 =0;
            vm.total.spot.total(result.Data.result.SpotTotalWeight);
            vm.total.spot.remaining(result.Data.result.SpotRemainingTotalWeight);
            vm.total.spot.temphold(result.Data.result.SpotTempholdTotalWeight);
            vm.total.spot.pledge(result.Data.result.SpotPledgeTotalWeight);
            vm.total.receipt.total(result.Data.result.ReceiptTotalWeight);
            vm.total.receipt.remaining(result.Data.result.ReceiptRemainingTotalWeight);
            vm.total.receipt.temphold(result.Data.result.ReceiptTempholdTotalWeight);
            vm.total.receipt.pledge(result.Data.result.PledgeTotalWeight);
            vm.total.totalWeight(result.Data.result.TotalWeight);
            vm.total.totalRemaining(result.Data.result.TotalRemainingWeight);
            vm.total.warehouseReceipt.total(result.data.result.WarehouseReceiptTotalWeight);
            vm.total.warehouseReceipt.temphold(result.data.result.WarehouseReceiptTempholdTotalWeight);
            vm.total.warehouseReceipt.pledge(result.data.result.WarehouseReceiptPledgeTotalWeight);
            vm.total.warehouseReceipt.remaining(result.data.result.WarehouseReceiptRemainingTotalWeight);
            vm.total.bill.total(result.data.result.BillTotalWeight);
            vm.total.bill.temphold(result.data.result.BillTempholdTotalWeight);
            vm.total.bill.pledge(result.data.result.BillPledgeTotalWeight);
            vm.total.bill.remaining(result.data.result.BillRemainingTotalWeight);

            if (items != null) {
                $.each(items, function (i, item) {
                    item.details = ko.observableArray();
                    t1 += item.SpotWeight; sumSpw += item.SpotPledgeWeight; t2 += item.ReceiptWeight; t3 += item.PledgeWeight;
                    t4 += item.SpotTempholdWeight; t5 += item.ReceiptTempholdWeight;
                    t6 += item.SpotRemainingWeight; t7 += item.ReceiptRemainingWeight;
                    t8 += item.WarehouseReceiptWeight; t9 += item.WarehouseReceiptTempholdWeight;
                    t10 += item.WarehouseReceiptPledgeWeight; t11 += item.WarehouseReceiptRemainingWeight;
                    t12 += item.BillWeight; t13 += item.BillTempholdWeight;
                    t14 += item.BillPledgeWeight; t15 += item.BillRemainingWeight;
                    t16 += item.TotalWeight; t17 += item.TotalRemainingWeight;
                    item.measureType = ko.observable((function () {
                        return ($.grep(vm.AllCommodities, function (elem) { return elem.name == item.Commodity; })[0] || {}).measureType;
                    })());
                    vm.list.push(item);
                })
            }
            vm.summary.spot.total(t1);
            vm.summary.spot.remaining(t6);
            vm.summary.spot.temphold(t4);
            vm.summary.spot.pledge(sumSpw);
            vm.summary.receipt.total(t2);
            vm.summary.receipt.remaining(t7);
            vm.summary.receipt.temphold(t5);
            vm.summary.receipt.pledge(t3);
            vm.summary.totalWeight(t16);
            vm.summary.totalRemaining(t17);
            vm.summary.warehouseReceipt.total(t8);
            vm.summary.warehouseReceipt.temphold(t9);
            vm.summary.warehouseReceipt.pledge(t10);
            vm.summary.warehouseReceipt.remaining(t11);
            vm.summary.bill.total(t12);
            vm.summary.bill.temphold(t13);
            vm.summary.bill.pledge(t14);
            vm.summary.bill.remaining(t15);

            _initializeExpandable();
            base._p(result.Data.pagination, options.searchUrl, vm.fill, function () {
                var query = $.extend(utils.serialize("#searchForm .gmk-data-field"), { Pagination: { PageSize: 20 } });
                if (query.CommodityId == null || query.CommodityId == '') {
                    query.CommodityId = models.UserCommodities[0].id;
                }
                if (self.tradeTypes.length == 1) {
                    query.TradeType = self.tradeTypes[0].value;
                }
                return query;
            });
        }
    }

    viewModel.call(this);

    self.onSearch = function () {
        self.isHistory(self.storageDate() && moment(self.storageDate()).toDate().valueOf() != moment(moment().format('YYYY-MM-DD'), 'YYYY-MM-DD').toDate().valueOf());
        var query = $.extend(utils.serialize("#searchForm .gmk-data-field"), { Pagination: { PageSize: 20 } });
        if (query.CommodityId == null || query.CommodityId == '') {
            query.CommodityId = models.UserCommodities[0].id;
        }
        if (self.tradeTypes.length == 1) {
            query.TradeType = self.tradeTypes[0].value;
        }
        self.isRemainingWeightReturned(self.isRemainingWeightReturnedParam());
        base._get(options.searchUrl, query, function (data) {
            self.fill(data);
        }, true);
    };

    self.onShowContracts = function (item, event) {
        if (item.ContractReport) {
            self.contracts(item.ContractReport);
            var t1 = 0, sumSpw = 0, t2 = 0, t3 = 0, t4 = 0, t5 = 0, t6 = 0, t7 = 0, t8 = 0,
                t9 = 0, t10 = 0, t11 = 0, t12 = 0, t13 = 0, t14 = 0, t15 = 0, t16 = 0, t17 = 0;
            $.each(item.ContractReport, function (i, item) {
                t1 += item.SpotWeight; sumSpw += item.SpotPledgeWeight; t2 += item.ReceiptWeight; t3 += item.PledgeWeight;
                t4 += item.SpotTempholdWeight; t5 += item.ReceiptTempholdWeight;
                t6 += item.SpotRemainingWeight; t7 += item.ReceiptRemainingWeight;
                t8 += item.WarehouseReceiptWeight; t9 += item.WarehouseReceiptTempholdWeight;
                t10 += item.WarehouseReceiptPledgeWeight; t11 += item.WarehouseReceiptRemainingWeight;
                t12 += item.BillWeight; t13 += item.BillTempholdWeight;
                t14 += item.BillPledgeWeight; t15 += item.BillRemainingWeight;
                t16 += item.TotalWeight; t17 += item.TotalRemainingWeight;
            });
            self.contractSummary.spot.total(t1);
            self.contractSummary.spot.remaining(t6);
            self.contractSummary.spot.temphold(t4);
            self.contractSummary.spot.pledge(sumSpw);
            self.contractSummary.receipt.total(t2);
            self.contractSummary.receipt.remaining(t7);
            self.contractSummary.receipt.temphold(t5);
            self.contractSummary.receipt.pledge(t3);
            self.contractSummary.totalWeight(t16);
            self.contractSummary.totalRemaining(t17);
            self.contractSummary.warehouseReceipt.total(t8);
            self.contractSummary.warehouseReceipt.temphold(t9);
            self.contractSummary.warehouseReceipt.pledge(t10);
            self.contractSummary.warehouseReceipt.remaining(t11);
            self.contractSummary.bill.total(t12);
            self.contractSummary.bill.temphold(t13);
            self.contractSummary.bill.pledge(t14);
            self.contractSummary.bill.remaining(t15);
        }
        utils.formatDecimal();
    };

    self.onShowReceipts = function (item, event) {
        if (item.ReceiptReport) {
            self.receipts(item.ReceiptReport);
            var t1 = 0, t2 = 0, t3 = 0;
            $.each(item.ReceiptReport, function (i, item) {
                t1 += item.IsPledge ? item.Weight : 0;
                t2 += item.IsPledge ? 0 : item.Weight;
                t3 += item.ReceiptTempholdWeight;
            });
            self.totalUnpledgeWeight(t2);
            self.totalPledgeWeight(t1);
            self.totalTempholdWeight(t3);
        }
        utils.formatDecimal();
    };

    self.onShowWarehouseReceipts = function (item, event) {
        if (item.WarehouseReceiptStorageReport) {
            self.receipts(item.WarehouseReceiptStorageReport);
            var t1 = 0, t2 = 0, t3 = 0;
            $.each(item.WarehouseReceiptStorageReport, function (i, item) {
                t1 += item.IsPledge ? item.Weight : 0;
                t2 += item.IsPledge ? 0 : item.Weight;
                t3 += item.ReceiptTempholdWeight;
            });
            self.totalUnpledgeWeight(t2);
            self.totalPledgeWeight(t1);
            self.totalTempholdWeight(t3);
        }
        utils.formatDecimal();
    };

    self.onShowBills = function (item, event) {
        if (item.BillOfLadingStorageReport) {
            self.receipts(item.BillOfLadingStorageReport);
            var t1 = 0, t2 = 0, t3 = 0;
            $.each(item.BillOfLadingStorageReport, function (i, item) {
                t1 += item.IsPledge ? item.Weight : 0;
                t2 += item.IsPledge ? 0 : item.Weight;
                t3 += item.ReceiptTempholdWeight;
            });
            self.totalUnpledgeWeight(t2);
            self.totalPledgeWeight(t1);
            self.totalTempholdWeight(t3);
        }
        utils.formatDecimal();
    };

    self.onCardInfoes = function (item, event) {
        if (item.StorageCardReport) {
            self.currentItem(item);
            self.cards(item.StorageCardReport);
            var t1 = 0, t2 = 0, sumPledgeWeight=0, t3 = 0;
            $.each(item.StorageCardReport, function (i, item) {
                t1 += item.AvailableWeight;
                t2 += item.Weight;
                t3 += item.SpotTempholdWeight;
                sumPledgeWeight += item.PledgeWeight;
            });
            self.totalAvailableWeight(t1);
            self.totalWeight(t2);
            self.totalPledgeWeight(sumPledgeWeight);
            self.totalSpotTempholdWeight(t3);
        }
        utils.formatDecimal();
    };

    self.onExport = function () {
        var query = utils.serialize("#searchForm .gmk-data-field");
        if (query.CommodityId == null || query.CommodityId == '') {
            query.CommodityId = models.UserCommodities[0].id;
        }
        utils.fileDownload(utils.urlAction('ExportWarehouseStorage', 'Report', query));
        //utils.downloadFile(function ($form, downloadToken) {
        //    var query = $.extend(utils.serialize("#searchForm .gmk-data-field"), { downloadToken: downloadToken });
        //    if (query.CommodityId == null || query.CommodityId == '') {
        //        query.CommodityId = models.UserCommodities[0].id;
        //    }
        //    var url = utils.urlAction('ExportWarehouseStorage', 'Report', query);
        //    $form.attr('action', url);
        //    $form.empty();
        //});
        //base._post(options.exportUrl, utils.serialize("#searchForm .gmk-data-field"), function (data) {
        //    if (data.Data) {
        //        window.location.assign(data.Data);
        //    }
        //});
    };

    self.initialize = function () {
        self.onSearch();
    };
}

$(document).ready(function () {
    GMK.Report.ByWarehouse.start();
});