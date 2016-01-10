/**
 * Created by dawson.liu on 13-9-12.
 */

var GMK = GMK || {};
GMK.Storage = GMK.Storage || {};
GMK.Storage.RevertRecords = GMK.Storage.RevertRecords || {};

GMK.Storage.RevertRecords.start = function () {
    GMK.Features.CommonModels.onReady(function (models) {
        var action = $("#gmk-route").data("action"), url = $.url();
        if (action == 'Manage') {
            var viewModel = new GMK.Storage.RevertRecords.ManageViewModel(models, {
                saveUrl: 'Storage/SaveRevertRecord',
                listUrl: 'Storage/RevertRecords',
                getUrl: 'Storage/GetRevertRecord',
                searchReceiptUrl: 'Storage/ListReceipts',
                listCardCodeUrl: 'WarehouseInfo/ListCardCode',
                isCardCodeGenerationRequiredUrl: 'WarehouseInfo/IsCardCodeGenerationRequired',
                id: url.param('id')
            });
            window.vm = viewModel;
            viewModel.initialize();
            ko.applyBindings(viewModel);
            $('#mainForm').validate({
                rules: {
                    'ConvertDate': {
                        required: {
                            depends: function () {
                                return viewModel.IsConversionCompleted();
                            }
                        }
                    }
                }
            });
        } else {
            models.registerQueryFormEvent();
            var viewModel = new GMK.Storage.RevertRecords.ListViewModel(models, {
                searchUrl: 'Storage/ListRevertRecords',
                deleteUrl: 'Storage/DeleteRevertRecord'
            });
            viewModel.initialize();
            ko.applyBindings(viewModel);
            viewModel.onSearch();
        }
    });
};

GMK.Storage.RevertRecords.ListViewModel = function (models, options) {
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

    self.initialize = function () {
    };
}

GMK.Storage.RevertRecords.ManageViewModel = function (models, options) {
    var self = $.extend(this, models);
    var base = GMK.Features.FeatureBase;

    self.isEditing = ko.observable(!!options.id);
    self.byPieceCommodityIds = $.map($.grep(models.AllCommodities, function (r) {
        return r.measureType === models.Enums.CommodityMeasureType.ByPiece;
    }), function (r) {
        return r.id;
    });
    self.commodityId = ko.observable();
    self.isByPiece = ko.computed(function () {
        return $.inArray(self.commodityId(), self.byPieceCommodityIds) !== -1;
    });
    //var bwExchangeName = ['渤海商品交易所', '无锡不锈钢交易所'];
    //self.bwExchangeIds = $.map($.grep(models.AllExchanges, function (r) {
    //    return $.inArray(r.name, bwExchangeName) !== -1;
    //}), function (r) {
    //    return r.id;
    //});
    self.isPieceBw = function (commodityId, exchangeId) {
        return $.inArray(commodityId, self.byPieceCommodityIds) !== -1 && $.inArray(exchangeId, models.bwExchangeIds) !== -1;
    };
    self.piecesList = ko.observableArray();
    self.selectedPiecesSummary = ko.computed(function () {
        var summary = { Count: 0, Weight: 0 };
        $.each(self.piecesList(), function (i, r) {
            if (r.isSelected()) {
                summary.Count++;
                summary.Weight = utils.round(summary.Weight + utils.round(r.Weight, 4), 4);
            }
        });
        return summary;
    });
    function viewModel() {
        var vm = this;
        vm.brands = ko.observableArray();
        vm.specifications = ko.observableArray();
        vm.toquery = {
            WarehouseId: ko.observable(),
            ExchangeId: ko.observable(),
            CommodityId: ko.observable(),
            BrandId: ko.observable(),
            SpecificationId: ko.observable(),
            CardCode: ko.observable()
        };
        vm.toquery.CommodityId.subscribe(function (id) {
            var commodity = utils.find(models.AllCommodities, function (r) {
                return r.id === id;
            });
            vm.brands((commodity || {}).brands || []);
            vm.specifications((commodity || {}).specifications || []);
        });
        vm.toquery.WarehouseId((models.AllWarehouses[0] || {}).id);
        vm.toquery.ExchangeId((models.AllExchanges[0] || {}).id);
        vm.toquery.CommodityId((models.UserCommodities[0] || {}).id);
        vm.toquery.BrandId((vm.brands[0] || {}).id);
        vm.toquery.SpecificationId((vm.specifications[0] || {}).id);

        vm.queried = ko.observable({});
        //vm.queried.subscribe(function (newVal) {
        //    self.commodityId(newVal.CommodityId);
        //});
        vm.isQueriedPieceBw = ko.computed(function () {
            return self.isPieceBw(vm.queried().CommodityId, vm.queried().ExchangeId);
        });
        //vm.queried = {};
        //vm.queried.WarehouseId = ko.observable();
        //vm.queried.CommodityId = ko.observable();
        //vm.queried.BrandId = ko.observable();
        //vm.queried.SpecificationId = ko.observable();

        //vm.selectedCommodityId = ko.observable();
        //vm.selectedCommodityId.subscribe(function (id) {
        //    vm.brands.removeAll();
        //    vm.specifications.removeAll();
        //    for (var i = 0; i < models.AllCommodities.length; i++) {
        //        var commodity = models.AllCommodities[i];
        //        if (commodity.id == id) {
        //            for (var j = 0; j < commodity.brands.length; j++) {
        //                vm.brands.push(commodity.brands[j])
        //            }
        //            for (var j = 0; j < commodity.specifications.length; j++) {
        //                vm.specifications.push(commodity.specifications[j])
        //            }
        //        }
        //    }
        //});
        //vm.selectedWarehouseId = ko.observable(models.AllWarehouses[0].id);
        //vm.selectedBrandId = ko.observable();
        //vm.selectedSpecificationId = ko.observable();

        vm.cardCode = ko.observable();
        vm.keepReceiptCode = ko.observable(false);
        vm.keepReceiptCode.subscribe(function (val) {
            vm.cardCode(val == true ? 'N/A' : vm.originalCardCode || '');
        });
        vm.isAutoGenerationRequired = ko.observable();
        vm.receiptList = ko.observableArray();
        vm.selectedWeight = ko.observable(0);
        vm.selectedCount = ko.computed(function () {
            var count = 0, weight = 0;
            $.each(vm.receiptList(), function (i, item) {
                if (item.isSelected()) { count++; weight += item.Weight }
            });
            vm.selectedWeight(parseFloat(weight.toFixed(6)));
            return count;
        });
        vm.IsSavedConverted = ko.observable(false);
        vm.IsConversionCompleted = ko.observable();
        vm.IsConversionCompleted.subscribe(function (val) {
            _isCardCodeAutoGenerated(vm.toquery.WarehouseId);
            if (!val) $('#ConvertDate').val('');
        });
        $('')
        vm.isAutoGenerationShow = ko.computed(function () {
            var isRequired = vm.isAutoGenerationRequired(),
                notKeepReceiptCode = vm.keepReceiptCode() == false,
                notByPiece = !vm.isByPiece(),
                isCompleted = vm.IsConversionCompleted();
            return isRequired && notKeepReceiptCode && notByPiece && isCompleted;
        });
        vm.isAutoGenerationShow.subscribe(function (newVal) {
            $('#CardCode')[newVal ? 'removeClass' : 'addClass']('card-code-full-width');
        });
        vm.cardCodeQuery = {
            dateRange: ko.observable(),
            isUsed: ko.observable(),
            note:ko.observable()
        };
        vm.cardCodeList = ko.observableArray();
        $('#SelectCardCodeDialog').on('hide', function () {
            // set the selected card code
            clearQuery();
            vm.cardCode(_previousChecked ? _previousChecked.cardCode : null);
        });
        $('#SelectCardCodeDialog').on('show', function () {
            vm.onSearchCardCode();
        });
        function clearQuery() {
            vm.cardCodeQuery.isUsed(false);
            vm.cardCodeQuery.dateRange('');
        }
        var _previousChecked = null;
        vm.onSearchCardCode = function () {
            var splittings = (vm.cardCodeQuery.dateRange() || '').split(' - ');
            base._get(options.listCardCodeUrl, {
                warehouseId: vm.toquery.WarehouseId(),
                used: vm.cardCodeQuery.isUsed() || false,
                startTime: splittings[0],
                endTime: splittings[1]
            }, function (result) {
                $.each(result.data, function (i, item) {
                    item.createTime = utils.formatDate(item.createTime, 'YYYY-MM-DD');
                    item.isSelected = ko.observable();
                    item.isSelected.subscribe(function (newVal) {
                        if (newVal) {
                            if (_previousChecked) _previousChecked.isSelected(false);
                            _previousChecked = item;
                        }
                    });
                });
                vm.cardCodeList(result.data);
            });
        };

        var _cache = {};
        function _isCardCodeAutoGenerated(warehouseId) {
            if (_cache[warehouseId]) return vm.isAutoGenerationRequired(_cache[warehouseId]);
            base._get(options.isCardCodeGenerationRequiredUrl, {
                warehouseId:warehouseId
            }, function (result) {
                _cache[warehouseId] = result.Data;
                vm.isAutoGenerationRequired(result.Data);
            });
        }

        vm.toJson = function () {
            var convertInfo = utils.serialize("#mainForm .gmk-data-field, #searchFrom .gmk-data-field");
            var convertDetails = [];
            $.each(vm.receiptList(), function (i, item) {
                if (item.isSelected()) {
                    convertDetails.push({
                        WFSpotReceiptConvertDetailInfoId: item.WFSpotReceiptConvertDetailInfoId || 0,
                        WFSpotReceiptConvertInfoId: item.WFSpotReceiptConvertInfoId || 0,
                        WFWarehouseStorageId: item.WFWarehouseStorageId
                    });
                }
            });

            convertInfo.IsReceiptCodeRemain = vm.keepReceiptCode() == true;
            convertInfo.WFSpotReceiptConvertInfoId = options.id || 0;
            convertInfo.WFSpotReceiptConvertDetailInfoes = convertDetails;
            convertInfo.WFWhStorageFlowTracks = self.isByPiece() ? $.map($.grep(self.piecesList(), function (r) {
                return r.isSelected();
            }), function (r) {
                return { TargetWarehouseStorageId: r.WFWarehouseStorageId };
            }) : vm.storageFlowTracks || [];
            return convertInfo;
        };

        vm.fill = function (result) {
            var record = result.Data.record;
            vm.storageFlowTracks = record.WFWhStorageFlowTracks || [];
            vm.ConvertDetailInfoes = record.WFSpotReceiptConvertDetailInfoes || [];
            vm.originalCardCode = record.CardCode;
            utils.deserialize("#mainForm .gmk-data-field, #searchFrom .gmk-data-field", record);
            vm.IsSavedConverted(!!record.ConvertDate);
            vm.IsConversionCompleted(!!record.ConvertDate);
            //if (vm.IsConversionCompleted()) $('#IsConversionCompleted').prop('disabled', true);
            vm.keepReceiptCode(!!record.IsReceiptCodeRemain);
            //vm.selectedWarehouseId(record.WarehouseId);

            vm.cacheStorage = result.Data.storages;
        };

        vm.fillReceiptList = function (data) {
            var newData = [];
            $.each(vm.cacheStorage || [], function (i, item) {
                item.isSelected = ko.observable(true);
                newData.push(item);
            });
            $.each(data, function (i, item) {
                item.isSelected = ko.observable(false);
                if (!vm.cacheStorage || $.grep(vm.cacheStorage, function (s) {
                    return s.WFWarehouseStorageId == item.WFWarehouseStorageId;
                }).length == 0) {
                    newData.push(item);
                }
            });
            $.each(vm.ConvertDetailInfoes || [], function (i, r1) {
                var receipt = utils.find(newData, function (r2) {
                    return r2.WFWarehouseStorageId === r1.WFWarehouseStorageId;
                });
                if (receipt) {
                    receipt.WFSpotReceiptConvertDetailInfoId = r1.WFSpotReceiptConvertDetailInfoId;
                    receipt.WFSpotReceiptConvertInfoId = r1.WFSpotReceiptConvertInfoId;
                }
            });
            vm.receiptList.removeAll();
            vm.receiptList(newData);
        };
    }

    viewModel.call(this);
    ko.SlimCheckExtension.call(this, this.receiptList);

    self.onSearchReceipts = function () {
        self.searchReceipts(null, true);
        //var warehouseId = self.selectedWarehouseId();
        //var commodityId = self.selectedCommodityId();
        //var brandId = self.selectedBrandId();
        //var specificationId = self.selectedSpecificationId();
        //var param = $.extend(utils.serialize("#searchFrom .gmk-data-field"), { IsSaleOut: false, IsPledge: false });
        //base._get(options.searchReceiptUrl, param, function (data) {
        //    self.queried.WarehouseId(warehouseId);
        //    self.queried.CommodityId(commodityId);
        //    self.commodityId(commodityId);
        //    self.queried.BrandId(brandId);
        //    self.queried.SpecificationId(specificationId);
        //    self.fillReceiptList(data);
        //});
    };

    self.searchReceipts = function (callback, isSearch) {
        var param = $.extend(ko.toJS(self.toquery), { IsSaleOut: false, IsPledge: false });
        //var warehouseId = self.selectedWarehouseId();
        //var commodityId = self.selectedCommodityId();
        //var brandId = self.selectedBrandId();
        //var specificationId = self.selectedSpecificationId();
        //var param = $.extend(utils.serialize("#searchFrom .gmk-data-field"), { IsSaleOut: false, IsPledge: false });
        //param.CardCode = param.CardCode1;
        //delete param.CardCode1;
        if (isSearch) {
            internalSearch(newCallback);
        } else {
            newCallback([]);
        }
        function internalSearch(cb) {
            base._get(options.searchReceiptUrl, param, function (result) {
                cb(result);
            });
        }
        function newCallback(result) {
            self.queried(param);
            self.commodityId(param.CommodityId);
            //self.queried.WarehouseId(warehouseId);
            //self.queried.CommodityId(commodityId);
            //self.commodityId(commodityId);
            //self.queried.BrandId(brandId);
            //self.queried.SpecificationId(specificationId);
            self.fillReceiptList(result);
            if (callback) {
                callback(result);
            }
        }
    };



    self.onSearchPieces = function () {
        self.searchPieces();
    };

    self.searchPieces = function (isInitialize) {
        var query = $.extend({}, ko.mapping.toJS(self.queried));
        delete query.ExchangeId;
        delete query.CardCode;
        $.extend(query, utils.serialize("#pieceSearch .gmk-data-field"));
        if (self.isEditing()) $.extend(query, { SpotReceiptConvertId: options.id });
        query.isInitialize = isInitialize;
        base._get('Storage/ListPiecesForRevertConvert', query, function (result) {
            self.fillPiecesList(result.Data);
        });
    };

    self.fillPiecesList = function (list) {
        var targetIds = $.map(self.storageFlowTracks || [], function (r) {
            return r.TargetWarehouseStorageId;
        });
        var pieces = $.map(list, function (r) {
            var exists = $.inArray(r.WFWarehouseStorageId, targetIds) !== -1;
            return $.extend(ko.toJS(r), { isSelected: ko.observable(exists) });
        });
        self.piecesList(pieces);
    };

    self.onSave = function () {
        base._saveThenBack(options.saveUrl, self.toJson());
    };

    self.initialize = function () {
        if (self.isEditing()) {
            base._get(options.getUrl, { id: options.id }, function (result) {
                self.commodityId(result.Data.record.CommodityId);
                self.fill(result);
                self.searchReceipts(null, false);
                //self.fillReceiptList([]);
                //self.onSearchReceipts();
                self.searchPieces(true);
            }, true);
        }
    };
    self.invalids = {
        main: ko.observable()
    };
    self.customShowErrors = ko.observable();
    utils.setCustomShowErrors(self.customShowErrors);
    self.setCustomShowErrors = {
        main: function () { self.customShowErrors(self.invalids.main); },
        noop: function () { self.customShowErrors($.noop); }
    };
}

$(document).ready(function () {
    GMK.Storage.RevertRecords.start();
});
