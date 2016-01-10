/**
 * Created by dawson.liu on 13-10-17.
 */

var GMK = GMK || {};
GMK.Storage = GMK.Storage || {};
GMK.Storage.SpotRecords = GMK.Storage.SpotRecords || {};

GMK.Storage.SpotRecords.start = function (viewRoute) {
    GMK.Features.CommonModels.onReady(function (models) {
        var $route = $("#gmk-route"), action = $route.data("action"), url = $.url();//, corporationId = $('#target-corporation').data('corporation');
        if (action == 'Manage') {
            var viewModel = new GMK.Storage.SpotRecords.ManageViewModel(models, {
                saveUrl: 'Storage/SaveSpotRecord',
                listUrl: 'Storage/SpotRecords',
                getUrl: 'Storage/GetSpotRecord',
                id: url.param('id'),
                //corporationId: corporationId
            });
            viewModel.initialize();
            ko.applyBindings(viewModel);
        } else if (action == 'Detail') {
            var viewModel = new GMK.Storage.SpotRecords.DetailViewModel(models, {
                getUrl: 'Storage/GetSpotRecord',
                id: url.param('id'),
                //corporationId: corporationId
            });
            viewModel.initialize(function () {
                ko.applyBindings(viewModel);
            });
        } else if (action == 'Import') {
            var viewModel = new GMK.Storage.SpotRecords.ImportWeightMemoViewModel(models, {
                saveUrl: 'Storage/SaveImportedWeightMemos',
                listCardCodeUrl: 'WarehouseInfo/ListCardCode',
                isCardCodeGenerationRequiredUrl: 'WarehouseInfo/IsCardCodeGenerationRequired',
                commodityId: $route.data('commodityid'),
                brandId: $route.data('brandid'),
                specificationId: $route.data('specificationid'),
                warehouseId: $route.data('warehouseid')
            });
            viewModel.ExportedReceiptsElem = $('#ImportedReceipts');
            viewModel.initializeHandsontable();
            ko.applyBindings(viewModel);
            viewModel.initialize();
        } else if (action == 'List') {
            var viewModel = new GMK.Storage.SpotRecords.ListViewModel(models, viewRoute, {
                searchUrl: 'Storage/ListSpotRecordsWithSummary',
                saveUrl: 'Storage/SaveAdjustment',
                deleteUrl: 'Storage/DeleteSpotRecord'
            });
            window.vm = viewModel;
            ko.applyBindings(viewModel);
            viewModel.registerQueryFormEvent();
            viewModel.initialize();
        }
    });
};

GMK.Storage.SpotRecords.ListViewModel = function (models, values,options) {
    var self = $.extend(this, models);
    var base = GMK.Features.FeatureBase;

    function viewModel() {
        var vm = this;
        vm.list = ko.observableArray();
        vm.pageSummary = {
            count: ko.observable(),
            weight: ko.observable(),
            availableWeight: ko.observable(),
            pledgeWeight: ko.observable(),
            tempholdWeight : ko.observable(),
        };
        vm.totalSummary = {
            count: ko.observable(),
            weight: ko.observable(),
            availableWeight: ko.observable(),
            pledgeWeight: ko.observable(),
            tempholdWeight: ko.observable(),
        };
        vm.currentWeights = ko.observable();
        vm.currentAvailableWeights = ko.observable();
        vm.currentPledgeWeights = ko.observable();

        vm.toquery = ko.mapping.fromJS(values.query);
        vm.queried = null;
        vm.Brands = ko.observableArray();
        vm.Specifications = ko.observableArray();
        vm.selectedCommodityAfterSearch = ko.observable();
        vm.isByWeight = ko.observable(true);
        vm.isByPiece = ko.observable(false);

        vm.LossWeight = ko.observable(0);
        vm.Note = ko.observable();
        vm.IsSaleOut = ko.observable(false);

        vm.ableToImportWeightMemo = false;
        vm.ableToAddSpot = false;
        $.each(models.UserCommodities, function (i, item) {
            switch (item.measureType) {
                case 1: vm.ableToImportWeightMemo = true;
                    break;
                case 2: vm.ableToAddSpot = true;
                    break;
            }
            if (vm.ableToAddSpot && vm.ableToImportWeightMemo) return false;
        });
        vm.targetWarehouse = ko.observable();
        vm.changeWarehouseNote = ko.observable();

        vm.storageTypes = $.grep(models.EnumOptions.InventoryStorageType, function (type) {
            return type.value !== models.Enums.InventoryStorageType.Receipt;
        });

        vm.toquery.CommodityId.subscribe(function (newVal) {
            if (newVal) {
                $.each(vm.AllCommodities, function (i, item) {
                    if (item.id == newVal) {
                        vm.isByWeight(item.measureType == models.Enums.CommodityMeasureType.ByWeight);
                        vm.isByPiece(item.measureType == models.Enums.CommodityMeasureType.ByPiece);
                        vm.Brands(item.brands);
                        vm.Specifications(item.specifications);
                        return false;
                    }
                });
            } else {
                vm.isByWeight(true);
                vm.isByPiece(false);
                vm.Brands([]);
                vm.Specifications([]);
            }
        });

        vm.list.subscribe(function () {
            var w1 = 0, w2 = 0, w3 = 0, w4 = 0, count = 0;
            $.each(vm.list(), function (i, item) {
                w1 += utils.parseFloat(item.Weight);
                w2 += utils.parseFloat(item.AailableWeight);
                w3 += utils.parseFloat(item.PledgeWeight);
                w4 += utils.parseFloat(item.TempholdWeight);
                count++;
            });
            vm.pageSummary.count(count);
            vm.pageSummary.weight(w1);
            vm.pageSummary.availableWeight(w2);
            vm.pageSummary.pledgeWeight(w3);
            vm.pageSummary.tempholdWeight(w4);
        });

        vm.fill = function (data) {
            for (var i = 0; i < data.result.length; i++) {
                data.result[i].CheckIsSaleOut = ko.observable(data.result[i].IsSaleOut);
                data.result[i].Checked = ko.observable(false);
            }
            vm.list(data.result);
            vm.totalSummary.count(data.summary.TotalCount);
            vm.totalSummary.weight(data.summary.TotalWeight);
            vm.totalSummary.availableWeight(data.summary.TotalAavaibleWeight);
            vm.totalSummary.pledgeWeight(data.summary.TotalPledgeWeight);
            vm.totalSummary.tempholdWeight(data.summary.TotalTempholdWeight);
            base._p(data.pagination, options.searchUrl, vm.fill, function () {
                return getSearchParam();
            });
        };
        vm.checkedList = ko.computed(function () {
            return $.grep(vm.list(), function (r) {
                return r.Checked();
            });
        });
        vm.checkAll = ko.observable(false);
        vm.checkAll.subscribe(function (value) {
            $.each(vm.list(), function (i, r) {
                r.Checked(value);
            });
        });
    }
    viewModel.call(this);

    function getSearchParam() {
        var param = ko.mapping.toJS(self.toquery);
        if (self.isByPiece()) {
            param.IsSaleOut = null;
            param.IsPledge = null;
            param.IsTempHold = null;
            param.IsAvailable = null;
        } else
            param.ReceiptStatus = null;

        if (param.StorageCode) {
            var index = param.StorageCode.indexOf(splitter);
            if (index != -1) {
                param.StartWeightMemoCode = param.StorageCode.substring(0, index);
                param.EndWeightMemoCode = param.StorageCode.substring(index + splitter.length);
                delete param.StorageCode;
            }
        }
        else {
            delete param.StorageCode;
            delete param.StartWeightMemoCode;
            delete param.EndWeightMemoCode;
        }
        return param;
    }

    var splitter = ' - ';
    self.onSearch = function () {
        var selectedCommodity ;
        $.each(models.AllCommodities, function (i, item) {
            if (item.id == self.toquery.CommodityId()) {
                selectedCommodity = item;
                return true;
            }
        });
        self.selectedCommodityAfterSearch(selectedCommodity);
        base._get(options.searchUrl, getSearchParam(), function (data) {
            self.fill(data);
        }, true);
    };

    self.onDelete = function (item, event) {
        base._delete(options.deleteUrl, { id: item.WFWarehouseStorageId }, function () {
            self.list.remove(item);
        });
    };

    self.onAdjust = function (item, event) {
        self.currentItem = item;
        self.LossWeight(item.LossWeight);
        self.Note(item.Note);
        self.IsSaleOut(item.IsSaleOut);
        utils.formatDecimal();
    };
    self.onChangeWarehouse = function () {
        var ids = $.map(self.checkedList(), function (r) {
            return r.WFWarehouseStorageId;
        });
        base._post('Storage/ChangeWarehouse', {
            ids: ids,
            targetWarehouse: self.targetWarehouse(),
            note: self.changeWarehouseNote()
        }, function (result) {
            $('#ChangeWarehouseModal').modal('hide');
            self.onSearch();
        });
    };

    self.initialize = function () {
        self.onSearch();
    };

    self.onSave = function (data, event) {
        self.currentItem.LossWeight = self.LossWeight();
        self.currentItem.IsSaleOut = self.IsSaleOut();
        self.currentItem.Note = self.Note();
        base._post(options.saveUrl, {
            WFWarehouseStorageId: self.currentItem.WFWarehouseStorageId,
            lossWeight: self.LossWeight(),
            isSaleOut: self.IsSaleOut(),
            note: self.Note()
        }, function () {
            self.currentItem.CheckIsSaleOut(self.IsSaleOut());
        });
        $(event.currentTarget).closest('.modal').modal('hide');
        utils.formatDecimal();
    };

    self.onBatchClearCard = function () {
        confirm('确定批量清卡？', function () {
            var ids = $.map(self.checkedList(), function (r) {
                return r.WFWarehouseStorageId;
            });
            base._post('Storage/BatchClearCard', {
                ids: ids
            }, function (result) {
                $.each(self.checkedList(), function (i, r) {
                    r.IsSaleOut = true;
                    r.CheckIsSaleOut(true);
                });
            });
        });
    };

    self.onBatchDelete = function (item, event) {
        utils.confirm('确定批量删除同批导入的所有库存？', function () {
            base._post('Storage/BatchDelete', { id: item.WFWarehouseStorageId }, function (result) {
                self.onSearch();
            });
        });
    };

    self.batch = {};
    self.batch.loaded = ko.observable(false);
    self.batch.Commodities = $.grep(models.UserCommodities, function (r) {
        return r.measureType === models.Enums.CommodityMeasureType.ByPiece;
    });
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

GMK.Storage.SpotRecords.ManageViewModel = function (models, options) {
    var self = $.extend(this, models);
    var base = GMK.Features.FeatureBase;

    function viewModel() {
        var vm = this;
        vm.brands = ko.observableArray();
        vm.specifications = ko.observableArray();
        vm.salers = ko.observableArray();
        vm.selectedCommodity = ko.observable();
        vm.selectedCommodityObj = ko.observable();
        //vm.selectedCommodityObj.subscribe(function (newVal) {
        //    if (!newVal || newVal.measureType == 2) $('#StorageCode').val('');
        //});
        vm.unitId = ko.observable();
        vm.selectedCommodity.subscribe(function (id) {
            for (var i = 0; i < models.AllCommodities.length; i++) {
                var commodity = models.AllCommodities[i];
                if (commodity.id == id) {
                    vm.unitId(commodity.unitId);
                    vm.selectedCommodityObj(commodity);
                    vm.brands(commodity.brands);
                    vm.specifications(commodity.specifications);
                }
            }
        });
        vm.storageTypes = $.grep(models.EnumOptions.InventoryStorageType, function (type) {
            return type.value !== models.Enums.InventoryStorageType.Receipt;
        });
        vm.selectedAccountEntity = ko.observable();
        vm.selectedAccountEntity.subscribe(function (newVal) {
            if (!newVal) vm.salers([]);
            vm.salers($.grep(models.AccountingEntities, function (item) {
                return item.id == newVal;
            })[0].salers);
        });
        vm.selectedSaler = ko.observable();
        vm.corporationId = ko.observable();
        vm.WhStorageType = ko.observable();
        vm.toJson = function () {
            var spot = utils.serialize("#mainForm .gmk-data-field");
            spot.WFWarehouseStorageId = options.id || 0;
            spot.measureType = vm.selectedCommodityObj().measureType;
            spot.wFStorageAssistantMeasureInfoes = self.wFStorageAssistantMeasureInfoes;
            spot.tradeType = self.tradeType;
            //if (!vm.selectedCommodityObj() || vm.selectedCommodityObj().measureType == 2) spot.StorageCode = '';
            return spot;
        }
        vm.fill = function (data) {
            utils.deserialize("#mainForm .gmk-data-field", data);
        }
    }

    viewModel.call(this);

    self.onSave = function () {
        base._saveThenBack(options.saveUrl, self.toJson());
    };
    
    self.initialize = function () {
        if (options.id) {
            base._get(options.getUrl, { id: options.id }, function (record) {
                self.fill(record);
                self.wFStorageAssistantMeasureInfoes = record.WFStorageAssistantMeasureInfoes;
                self.tradeType = record.TradeType;
            });
        } else {
            self.corporationId(window.GMK.Context.CorporationId);
        }
    }
}

GMK.Storage.SpotRecords.DetailViewModel = function (models, options) {
    var self = $.extend(this, models);
    var base = GMK.Features.FeatureBase;
    self.item = {};
    self.initialize = function (callback) {
        base._get(options.getUrl, { id: options.id }, function (data) {
            $.extend(self.item, ko.mapping.fromJS(data));
            if (callback) {
                callback();
            }
        });
    };
}

GMK.Storage.SpotRecords.ImportWeightMemoViewModel = function (models, options) {
    var self = $.extend(this, models);
    var base = GMK.Features.FeatureBase;

    function viewModel() {
        var vm = this;
        vm.searchForCardCode = ko.observable();
        vm.searchForCardCode.subscribe(function (val) {
            $.each(vm.list(), function (i, item) { item.isVisible(item.GroupCode.indexOf(val) > -1) });
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

        vm.cardCodeQuery = {
            dateRange: ko.observable(),
            isUsed: ko.observable(),
            note: ko.observable()
        };
        vm.cardCodeList = ko.observableArray();

        var mapping = {
            ReceiptNo: 0,
            Code: 1,
            Weight: 2,
            Note: 3
        };
        vm.FiteredCommodities = $.grep(vm.UserCommodities, function (item) {
            return item.measureType == 1;
        });
        vm.FilteredSalers = ko.observableArray();
        vm.AccountingEntities = ko.observableArray();
        vm.Commodity = ko.observable();
        var runnerId = null;
        var changedData = {
            isChanged: ko.observable(false),
            trigger: function () {
                var groupSize = 3;
                var self = this;
                if (self.isChanged()) return;
                self.isChanged(true);
                function _setIfChanged(row, col, newVal) {
                    if (vm.ExportedReceiptsElem.handsontable('getDataAtCell', row, col) != newVal) {
                        vm.ExportedReceiptsElem.handsontable('setDataAtCell', row, col, newVal);
                    }
                }
                function _runer() {
                    for (var i = 1, items = vm.ImportedReceipts, length = items.length - 1 ; i < length;) {
                        var batch = Math.min(groupSize, length - i - 1) + 1;
                        (function (j, b) {
                            setTimeout(function () {
                                for (var m = 0; m < b; m++, j++) {
                                    if (j == (length - 1)) self.onComplete();
                                }
                            }, 0);
                        })(i, batch);
                        i = i + batch;
                    }
                }
                runnerId = setTimeout(_runer, 0);
            },
            onComplete: function () {
                this.isChanged(false);
            }
        };
        vm.changedData = changedData;
        vm.Commodity.subscribe(function (newVal) {
            $.each(vm.AllCommodities, function (i, item) {
                if (item.id == newVal) {
                    vm.Brands(item.brands);
                    vm.Specifications(item.specifications);
                    vm.AccountingEntities(item.accountEntities);
                    return false;
                }
            });
            var commodityName = vm.findCommodity(newVal);
            vm.CommodityName = commodityName;
            changedData.trigger();
        });
        vm.Brands = ko.observableArray();
        vm.Brand = ko.observable();
        vm.Brand.subscribe(function (newVal) {
            var brandName = vm.findBrand(newVal, vm.Commodity());
            vm.BrandName = brandName;
            changedData.trigger();
        });
        vm.Specifications = ko.observableArray();
        vm.Specification = ko.observable();
        vm.Specification.subscribe(function (newVal) {
            var specificationName = vm.findSpecification(newVal, vm.Commodity());
            vm.SpecificationName = specificationName;
            changedData.trigger();
        });
        vm.Warehouse = ko.observable();
        vm.Warehouse.subscribe(function (newVal) {
            vm.cardCodeList([]);
            var warehouseName = vm.findWarehouse(newVal);
            vm.WarehouseName = warehouseName;
            _isCardCodeAutoGenerated(newVal);
            changedData.trigger();
        });
        vm.isAutoGenerationRequired = ko.observable();
        vm.isAutoGenerationRequired.subscribe(function (newVal) {
            vm.initializeHandsontable();
        });
        var _cache = {};
        function _isCardCodeAutoGenerated(warehouseId) {
            if (!warehouseId) {
                vm.isAutoGenerationRequired(false);
                return;
            }
            if (_cache[warehouseId]) return vm.isAutoGenerationRequired(_cache[warehouseId]);
            base._get(options.isCardCodeGenerationRequiredUrl, {
                warehouseId: warehouseId
            }, function (result) {
                _cache[warehouseId] = result.Data;
                vm.isAutoGenerationRequired(result.Data);
            });
        }
        vm.TotalReceipts = ko.observable(0);
        vm.TotalReceiptWeight = ko.observable(0);
        vm.Headers = ['卡号', '码单号', '重量', '备注'];
        vm.ImportedReceipts = [];

        vm.SalerId = ko.observable();
        vm.selectedAccountingEntity = ko.observable();
        vm.selectedAccountingEntity.subscribe(function (newVal) {
            if (!newVal) vm.FilteredSalers([]);
            vm.FilteredSalers($.grep(models.AccountingEntities, function (item) {
                return item.id == newVal;
            })[0].salers);
        });

        vm.fill = function (data) {
            $.each(data, function (i, item) {
                item.isSelected = ko.observable(true);
                item.isVisible = ko.observable(true);
            });
            vm.list(data);
        }
    }

    viewModel.call(this);
    self.initializeHandsontable = function () {
        var columns = self.isAutoGenerationRequired() ? [
                {
                    data: 0,
                    type: 'selectfromdialog',
                },
                {
                    data: 1
                },
                {
                    data: 2
                },
                {
                    data: 3
                }
        ] : [
                {
                    data: 0
                },
                {
                    data: 1
                },
                {
                    data: 2
                },
                {
                    data: 3
                }
        ];
        var instance = self.ExportedReceiptsElem.handsontable('getInstance');
        if (instance) instance.destroy();
        self.ExportedReceiptsElem.data('handsontable', null);
        self.ExportedReceiptsElem.handsontable({
            data: self.ImportedReceipts,
            dataSchema : [],
            startRows: 1,
            startCols: 4,
            maxCols: 4,
            minSpareRows: 1,
            rowHeaders: true,
            colHeaders: true,
            contextMenu: true,
            stretchH: 'all',
            colHeaders: self.Headers,
            columns: columns
        });
        self.ExportedReceiptsElem.handsontable('getInstance').addHook('afterChange', function (changes) {
            $.each(changes, function (i, item) {
                if (item[1] >= 2) {
                    var totalCount = self.ExportedReceiptsElem.handsontable('countRows') - 1;
                    var totalAmount = 0;
                    $.each(self.ImportedReceipts, function (i, item) {
                        totalAmount += utils.parseFloat(item[2]);
                    });
                    self.TotalReceipts(totalCount);
                    self.TotalReceiptWeight(totalAmount);
                    return false;
                }
            });
        });
    };
    var _previousChecked = null;
    self.onSearchCardCode = function () {
        var splittings = (self.cardCodeQuery.dateRange() || '').split(' - ');
        base._get(options.listCardCodeUrl, {
            warehouseId: self.Warehouse(),
            used: self.cardCodeQuery.isUsed() || false,
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
            self.cardCodeList(result.data);
        });
    };
    $('#SelectCardCodeDialog').on('hide', function () {
        // set the selected card code
        var selection = $('#SelectCardCodeDialog').data('cell-pos');
        var instance = self.ExportedReceiptsElem.handsontable('getInstance');
        instance.setDataAtCell(selection[1], selection[0], _previousChecked ? _previousChecked.cardCode : null);
        instance.selectCell(selection[1], selection[0]);
    });
    self.onSave = function () {
        var datas = [], len = self.Headers.length;
        $.each(self.ImportedReceipts.slice(0), function (i, item) {
            var result = [];
            for (var index in item) result[index] = item[index];
            var j = result.length;
            while (j < len) {
                result[j] = '';
                j++;
            }
            datas.push(result);
        });
        datas.splice(0, 0, self.Headers);
        base._save(options.saveUrl, {
            datas: datas,
            summary: {
                AccountEntityId: self.selectedAccountingEntity(),
                SalerId: self.SalerId(),
                CommodityId: self.Commodity(),
                BrandId: self.Brand(),
                SpecificationId: self.Specification(),
                WarehouseId: self.Warehouse()
            }
        });
    };

    self.initialize = function () {
        self.Commodity(options.commodityId);
        self.Brand(options.brandId);
        self.Specification(options.specificationId);
        self.Warehouse(options.warehouseId);
    }
};