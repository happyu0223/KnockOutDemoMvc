/**
 * Created by dawson.liu on 13-9-6.
 */

var GMK = GMK || {};
GMK.Storage = GMK.Storage || {};
GMK.Storage.MakeRecords = GMK.Storage.MakeRecords || {};

GMK.Storage.MakeRecords.start = function (route) {
    GMK.Features.CommonModels.onReady(function (models) {
        var action = $("#gmk-route").data("action"), url = $.url();
        if (action == 'Manage') {
            var viewModel = new GMK.Storage.MakeRecords.ManageViewModel(models, {
                searchUrl: 'Storage/ListSpotStorage',
                saveUrl: 'Storage/SaveMadeReceipts',
                listUrl: 'Storage/MakeRecords',
                getUrl: 'Storage/GetMakeRecord',
                searchReceiptUrl: 'Storage/ListReceiptsForMakeReceipt',
                generateSpotReceiptConvertInfoCodeUrl: 'Storage/GenerateSpotReceiptConvertInfoCode',
                editOutRecordUrl: route.editOutRecordUrl,
                id: url.param('id')
            });
            viewModel.initialize();
            window.vm = viewModel;
        } else {
            models.registerQueryFormEvent();
            var viewModel = new GMK.Storage.MakeRecords.ListViewModel(models, {
                searchUrl: 'Storage/ListMakeRecords',
                deleteUrl: 'Storage/DeleteMakeRecord',
                exportDeliveryBillUrl: 'Report/MakeReceiptExportDeliveryBill',
                cancelFinishUrl: 'Storage/CancelFinishMakeRecord'
            });
            viewModel.initialize();
            ko.applyBindings(viewModel);
            viewModel.onSearch();
        }
    });
};

GMK.Storage.MakeRecords.ListViewModel = function (models, options) {
    var self = $.extend(this, models);
    var base = GMK.Features.FeatureBase;

    function viewModel() {
        var vm = this;
        vm.list = ko.observableArray();
        vm.currentWeights = ko.observable();
        vm.list.subscribe(function () {
            var w = 0;
            $.each(vm.list(), function (i, item) {
                w += utils.parseFloat(item.ConvertWeight);
            });
            vm.currentWeights(w);
        });
        vm.totalCount = ko.observable();
        vm.totalWeights = ko.observable();
        vm.fill = function (data) {
            $.each(data.result, function (i, item) {
                item.ConvertDate = ko.observable(item.ConvertDate);
            });
            vm.list(data.result);
            vm.totalCount(data.summary.TotalCount);
            vm.totalWeights(data.summary.TotalWeight);
            base._p(data.pagination, options.searchUrl, vm.fill);
        }
    }
    viewModel.call(this);

    self.onSearch = function () {
        base._get(options.searchUrl, utils.serialize("#searchForm .gmk-data-field"), function (data) {
            self.fill(data);
        }, true);
    };

    self.onDelete = function (item, event) {
        base._delete(options.deleteUrl, { id: item.WFSpotReceiptConvertInfoId }, function () {
            self.list.remove(item);
        });
    };
    self.onExportDeliveryBill = function (item) {
        utils.fileDownload(utils.urlAction('MakeReceiptExportDeliveryBill', 'Report', { spotReceiptConvertInfoId: item.WFSpotReceiptConvertInfoId }));
        //utils.downloadFile(function ($form, downloadToken) {
        //    var url = utils.urlAction('MakeReceiptExportDeliveryBill', 'Report', { spotReceiptConvertInfoId: item.WFSpotReceiptConvertInfoId, downloadToken: downloadToken });
        //    $form.attr('action', url);
        //});
    };

    self.initialize = function () {
    };

    self.onCancelFinish = function (item, event) {
        confirm('你确定要取消完成制单吗？', function () {
            base._post(options.cancelFinishUrl, { id: item.WFSpotReceiptConvertInfoId }, function (result) {
                item.ConvertDate('');
            });
        });
    };
}

GMK.Storage.MakeRecords.ManageViewModel = function (models, options) {
    var self = $.extend(this, models);
    var base = GMK.Features.FeatureBase;

    self.byPieceCommodityIds = $.map($.grep(models.AllCommodities, function (r) {
        return r.measureType === models.Enums.CommodityMeasureType.ByPiece;
    }), function (r) {
        return r.id;
    });
    function viewModel() {
        var vm = this;
        vm.id = options.id;
        vm.brands = ko.observableArray();
        vm.specifications = ko.observableArray();
        vm.accountingEntities = ko.observableArray();
        vm.warehouseId = ko.observable();
        vm.commodityId = ko.observable();
        vm.commodity = ko.computed(function () {
            return utils.find(models.AllCommodities, function (r) {
                return vm.commodityId() === r.id;
            });
        });
        vm.weightPrecision = ko.computed(function () {
            return (vm.commodity() || {}).weightDigts || models.settings.weightDigits;
        });
        vm.code = ko.observable();
        vm.exchangeId = ko.observable();
        vm.isByPiece = ko.computed(function () {
            return $.inArray(vm.commodityId(), vm.byPieceCommodityIds) !== -1;
        });
        vm.brandId = ko.observable();
        vm.specificationId = ko.observable();
        vm.salerId = ko.observable();

        vm.isPieceBw = function (commodityId, exchangeId) {
            return $.inArray(commodityId, vm.byPieceCommodityIds) !== -1 && $.inArray(exchangeId, models.bwExchangeIds) !== -1;
        };
        vm.isQueriedPieceBw = ko.computed(function () {
            return self.isPieceBw(vm.commodityId(), vm.exchangeId());
        });
        vm.voucherCode = ko.observable();
        vm.IsConvertedSuccessful = ko.observable(false);
        vm.isVoucherCodeEnable = ko.computed(function () {
            return vm.IsConvertedSuccessful() && vm.isQueriedPieceBw();
        });
        vm.isVoucherCodeEnable.subscribe(function (newVal) {
            if (!newVal) vm.voucherCode('');
        });
        vm.IsConvertedSuccessful.subscribe(function (newVal) {
            if (!newVal) {
                $('#ConvertDate').val('');
                $('#ConvertCost').val('');
            }
        });
        vm.commodityId.subscribe(function (id) {
            for (var i = 0; i < models.AllCommodities.length; i++) {
                var commodity = models.AllCommodities[i];
                if (commodity.id == id) {
                    vm.brands(commodity.brands.slice(0));
                    vm.specifications(commodity.specifications.slice(0));
                    vm.accountingEntities(commodity.accountEntities.slice(0));
                }
            }
        });

        vm.spotList = ko.observableArray();
        vm.receiptFillVisisble = ko.observable(false);

        vm.receiptList = ko.observableArray();
        vm.selectedWeight = ko.observable(0);
        vm.selectedCount = ko.computed(function () {
            var count = 0, weight = 0, p = vm.weightPrecision();
            $.each(vm.receiptList(), function (i, item) {
                if (item.isSelected()) {
                    count++;
                    weight = utils.roundWeight(weight + utils.roundWeight(item.Weight, p), p);
                }
            });
            vm.selectedWeight(weight);
            return count;
        });

        vm.ConvertWeightComputed = ko.computed(function () {
            var sum = 0, p = vm.weightPrecision();
            $.each(vm.spotList(), function (i, spot) {
                sum = utils.roundWeight(sum + utils.roundWeight(spot.RequestWeight, p), p);
            });
            return sum;
        });
        vm.TotalActualWeightComputed = ko.computed(function () {
            var sum = 0, p = vm.weightPrecision();
            $.each(vm.spotList(), function (i, spot) {
                sum = utils.roundWeight(sum + utils.roundWeight(spot.ActualWeight, p), p);
            });
            return sum;
        });

        vm.Salers = ko.observableArray();
        vm.selectedAccountingEntity = ko.observable();
        vm.selectedAccountingEntity.subscribe(function (newVal) {
            vm.Salers(newVal ? $.grep(models.AccountingEntities, function (item) {
                return item.id == newVal;
            })[0].salers : []);
        });

        vm.toJson = function () {
            var result = $.extend({}, utils.serialize("#mainForm .gmk-data-field"), { WFSpotReceiptConvertInfoId: options.id });
            if (vm.IsConvertedSuccessful() && !vm.isQueriedPieceBw()) {
                var storageFlowTracks = [];
                $.each(vm.receiptList(), function (i, item) {
                    if (item.isSelected()) {
                        storageFlowTracks.push({
                            TargetWarehouseStorageId: item.WFWarehouseStorageId
                        });
                    }
                });
                result.WFWhStorageFlowTracks = storageFlowTracks;
            }
            if (vm.isVoucherCodeEnable()) result.VoucherCode = vm.voucherCode();
            return result;
        };

        vm.onGenerateSpotReceiptConvertCode = function () {
            base._get(options.generateSpotReceiptConvertInfoCodeUrl, { commodityId: vm.commodityId() }, function (data) {
                vm.code(data.data);
            }, false);
        };

        vm.fillSpotList = function (data) {
            vm.spotList(data.WFSpotReceiptConvertDetailInfoes);
            storageFlowTracks = data.WFWhStorageFlowTracks;
        };

        var storageFlowTracks = [];
        vm.fillReceiptList = function (data) {
            vm.receiptList.removeAll();
            $.each(data, function (i, item) {
                var exists = false;
                $.each(storageFlowTracks, function (j, r) {
                    if (r.TargetWarehouseStorageId === item.WFWarehouseStorageId) { exists = true; return false; }
                });
                item.isSelected = ko.observable(exists);
            });
            vm.receiptList(data);
        };
    }

    viewModel.call(this);

    self.onSearchReceipts = function () {
        _searchReceipts();
    };
    function _searchReceipts() {
        self.receiptFillVisisble(true);
        var query = $.extend({}, utils.serialize('#mainForm .gmk-data-field'), utils.serialize("#receiptSearchFrom .gmk-data-field"));
        if (options.id) $.extend(query, { SpotReceiptConvertId: options.id });
        base._get(options.searchReceiptUrl, query, function (result) {
            self.fillReceiptList(result.Data);
        });
    };

    self.onSave = function () {
        if (self.IsConvertedSuccessful() && !self.isQueriedPieceBw()) {
            if (self.selectedWeight() < Math.Epsilon) {
                alert('请选择至少一张仓单');
                return;
            }
            var cntNonActualWeight= $.grep(self.spotList(), function (r) {
                return !r.ActualWeight;
            }).length;
            if (cntNonActualWeight) {
                alert('实际制单重量未设置');
                return;
            }
            if (self.selectedWeight() !== self.TotalActualWeightComputed()) {
                //alert('实际制单总重量与已选仓单总重量不匹配');
                //return;
                //}
                if (Math.abs(self.selectedWeight() - self.TotalActualWeightComputed()) >= Math.Epsilon) {
                    confirm('实际制单总重量与已选仓单总重量不匹配，是否确认提交？', function () {
                        base._saveThenBack(options.saveUrl, self.toJson());
                    }, function () {
                        return false;
                    });
                }
            } else {
                base._saveThenBack(options.saveUrl, self.toJson());
            }
        } else {
            if (self.IsConvertedSuccessful() && !self.spotList().length) {
                alert('请先为此次制单执行发货操作，然后才能完成制单');
                return;
            }
            base._saveThenBack(options.saveUrl, self.toJson());
        }
    };

    self.onSaveAndUpdateOutRecord = function () {
        base._post(options.saveUrl, self.toJson(), function (result) {
            location.href = options.editOutRecordUrl + '?' + $.param({
                //wfSpotReceiptConvertInfoId: result.Data.WFSpotReceiptConvertInfoId
                wfSpotReceiptConvertInfoId: result.Data
            });
        });
    };

    self.initialize = function () {
        $("#ManageForm").validate({
            rules: {
                "ConvertDate": {
                    "required": {
                        depends: function () {
                            return self.IsConvertedSuccessful();
                        }
                    }
                }
            }
        });
        if (options.id) {
            base._get(options.getUrl, { id: options.id }, function (result) {
                var record = result.Data.spotReceipt;
                self.fillSpotList(record);
                utils.deserialize("#mainForm .gmk-data-field", record);
                self.voucherCode(record.VoucherCode);
                _searchReceipts();
                self.IsConvertedSuccessful(!!$("#ConvertDate").val());
                if (self.IsConvertedSuccessful()) $("#IsConvertedSuccessful").prop("disabled", true);
            });
        }
        ko.applyBindings(self);
        $('#CommodityId').change(function () {
            $('#Code').val('');
        });
    };
    self.invalids = {
        main: ko.observable()
    };
    self.customShowErrors = ko.observable();
    utils.setCustomShowErrors(self.customShowErrors);
    self.setCustomShowErrors = {
        main: function () {
            self.customShowErrors(self.invalids.main);
        },
        noop: function () {
            self.customShowErrors($.noop);
        }
    };
}
