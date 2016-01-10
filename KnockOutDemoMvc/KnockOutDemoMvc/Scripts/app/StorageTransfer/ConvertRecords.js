/**
 * Created by amy.bai on 15-06-30.
 */

var GMK = GMK || {};
GMK.StorageTransfer = GMK.StorageTransfer || {};
GMK.StorageTransfer.ConvertRecords = GMK.StorageTransfer.ConvertRecords || {};

GMK.StorageTransfer.ConvertRecords.start = function (values) {
    var baseUrl = 'StorageTransfer/';
    GMK.Features.CommonModels.onReady(function (models) {
        var action = $("#gmk-route").data("action"), url = $.url();
        if (action == 'Manage') {
            var viewModel = new GMK.StorageTransfer.ConvertRecords.ManageViewModel(models, {
                searchUrl: baseUrl + 'ListConvert',
                saveUrl: baseUrl + 'SaveConvert',
                getUrl: baseUrl + 'GetConvert',
                generatetConvertCodeUrl: baseUrl + 'GenerateConvertCode',
                indexUrl: baseUrl + 'ConvertIndex',
            }, values);
            viewModel.initialize();
        } else if(action == 'List') {
            var viewModel = new GMK.StorageTransfer.ConvertRecords.ListViewModel(models, {
                searchUrl: baseUrl + 'GetConvertList',
                deleteUrl: baseUrl + 'DeleteConvert',
                cancelFinishUrl: baseUrl + 'CancelFinishConvert',
                finishUrl: baseUrl + 'FinishConvert',
            }, values);
            ko.applyBindings(viewModel);
            viewModel.registerQueryFormEvent();
            viewModel.initialize();
          //  utils.responseStateChange();
         //   viewModel.registerStateChange(viewModel.initialize());
        } else if (action == 'Details') {
            var viewModel = new GMK.StorageTransfer.ConvertRecords.DetailsViewModel(models, {
                getUrl: baseUrl + 'GetConvert',
            }, values);
            viewModel.initialize(function () { ko.applyBindings(viewModel); });
            window.vm = viewModel;
        }
    });
};

GMK.StorageTransfer.ConvertRecords.ManageViewModel = function (models, options, values) {
    var self = this;
    $.extend(self, models);
    self.commonModels = models;
    var base = GMK.Features.FeatureBase; 
    self.targetDisable = ko.observable(true);
    self.sourceWarehouses = ko.observableArray();
    self.targetWarehouses = ko.observableArray();
    self.exchangeId = ko.observable();
    self.convertCost = ko.observable();
    self.isReceiptCodeRemain = ko.observable();
    self.voucherCode = ko.observable();
    self.convertTypes = $.grep(models.EnumOptions.StorageConversionType, function (r) {
        return r.value == models.Enums.StorageConversionType.SpotToExchangeReceipt ||
            r.value == models.Enums.StorageConversionType.ExchangeReceiptToSpot ||
            r.value == models.Enums.StorageConversionType.SpotToWarehouseReceipt ||
            r.value == models.Enums.StorageConversionType.SpotToBill ||
            r.value == models.Enums.StorageConversionType.BillToSpot ||
            r.value == models.Enums.StorageConversionType.WarehouseReceiptToSpot;
    });
    // self.convertTypes = models.EnumOptions.StorageConversionType;
    self.selectedCorporation = function () {
        //for (var i = 0; i < models.AllCorporations.length; i++) {
        //    var corporation = models.AllCorporations[i];
        //    if (corporation.id.toString() == values.corporationId.toString()) {
        //        return corporation;
        //    }
        //}
        return models._findCompany(+values.corporationId);
    };

    self.item = ko.mapping.fromJS(values.convert);
    self.departments = ko.computed(function () {
        var departments = [];
        $.each(models.AllCommodities, function (i,commodity) {
            if (commodity.id == self.item.commodityId()) {
                departments = commodity.businessDepartments.slice(0);
                return true;
            }
        });
        return departments;
    });
    self.salers = ko.computed(function () {
        var department = $.grep(self.departments(), function (item) {
            return item.id == self.item.departmentId();
        });
        return department.length > 0 ? department[0].salers : [];
    });
    self.accountingEntities = ko.computed(function () {
        var department = $.grep(self.departments(), function (item) {
            return item.id == self.item.departmentId();
        });
        return department.length > 0 ? department[0].accountEntities : [];
    });
    self.item.commodityId.subscribe(function (id) {
        for (var i = 0; i < models.AllCommodities.length; i++) {
            var commodity = models.AllCommodities[i];
            if (commodity.id == id) {
                self.item.unitId(commodity.unitId);
                return true;
            }
        }
    });

    self.item.storageConversionType.subscribe(function (newVal) {
        if (newVal == models.Enums.StorageConversionType.BillToSpot) {
            self.targetDisable(false);
            self.targetWarehouses(models.AllWarehouses);
            self.sourceWarehouses(models.AllLogistics);
        } else
            if (newVal == models.Enums.StorageConversionType.SpotToBill) {
                self.targetDisable(false);
                self.sourceWarehouses(models.AllWarehouses);
                self.targetWarehouses(models.AllLogistics);
            }
            else {
                self.targetDisable(true);
                self.targetWarehouses(models.AllWarehouses);
                self.sourceWarehouses(models.AllWarehouses);
                self.item.targetWarehouseId(self.item.sourceWarehouseId());
            }
    });

    self.item.sourceWarehouseId.subscribe(function (newVal) {
        if (self.item.storageConversionType() == models.Enums.StorageConversionType.BillToSpot
             || self.item.storageConversionType() == models.Enums.StorageConversionType.SpotToBill) {
        } else {
            self.item.targetWarehouseId(newVal);
        }
    });

    self.onGenerateConvertCode = function () {
        base._get(options.generatetConvertCodeUrl, { commodityId: self.item.commodityId() }, function (data) {
            self.item.code(data.data);
        }, false);
    };

    self.onSave = function () {
        self.preSave();
        base._saveThenBack(options.saveUrl, ko.mapping.toJS(self.item));
    };
    self.onSaveAndUpdateOutRecord = function () {
        self.preSave();
        base._post(options.saveUrl, ko.mapping.toJS(self.item), function (result) {
            location.href = values.editOutRecordUrl + '?' + $.param({
                storageConvertId: result.ExtraData,
                redirect: values.indexUrl
            });
        });
    };

    self.preSave = function () {
        if (self.item.storageConversionType() ==
            models.Enums.StorageConversionType.SpotToExchangeReceipt ||
            self.item.storageConversionType() == models.Enums.StorageConversionType.ExchangeReceiptToSpot) {
            self.item.exchangeId = self.exchangeId();
            self.item.convertCost = self.convertCost();
        }

        if (self.item.storageConversionType() ==
            models.Enums.StorageConversionType.SpotToExchangeReceipt) {
            self.item.voucherCode = self.voucherCode();
        }

        if (self.item.storageConversionType() ==
            models.Enums.StorageConversionType.ExchangeReceiptToSpot) {
            self.item.isReceiptCodeRemain = self.isReceiptCodeRemain();
        }
    };
    
    self.postGet = function () {
        if (self.item.storageConversionType() ==
            models.Enums.StorageConversionType.SpotToExchangeReceipt ||
            self.item.storageConversionType() == models.Enums.StorageConversionType.ExchangeReceiptToSpot) {
            self.exchangeId(self.item.exchangeId());
            self.convertCost(self.item.convertCost());
        }

        if (self.item.storageConversionType() ==
            models.Enums.StorageConversionType.SpotToExchangeReceipt) {
            self.voucherCode(self.item.voucherCode());
        }

        if (self.item.storageConversionType() ==
            models.Enums.StorageConversionType.ExchangeReceiptToSpot) {
            self.isReceiptCodeRemain(self.item.isReceiptCodeRemain());
        }
    };

    self.initialize = function () {
        if (values.id) {
            base._get(options.getUrl, { id: values.id }, function (result) {
                ko.mapping.fromJS(result, self.item);
                self.item.salerId(result.salerId);
                self.item.accountEntityId(result.accountEntityId);
                self.postGet();
            });
        } else {
            self.item.storageConversionType(models.Enums.StorageConversionType.SpotToWarehouseReceipt);
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
        }
    };
}

GMK.StorageTransfer.ConvertRecords.ListViewModel = function (models, options, values) {
    var self = this;
    $.extend(self, models);
    self.commonModels = models;
    var base = GMK.Features.FeatureBase;
    self.items = ko.observableArray();
    self.accountingEntities = ko.observableArray();
    self.targetWarehouses = ko.observableArray();
    self.sourceWarehouses = ko.observableArray();
    self.targetDisable = ko.observable(true);
    self.exchangeDisable = ko.observable(true);
    self.convertTypes = $.grep(models.EnumOptions.StorageConversionType, function (r) {
        return r.value == models.Enums.StorageConversionType.SpotToExchangeReceipt ||
            r.value == models.Enums.StorageConversionType.ExchangeReceiptToSpot ||
            r.value == models.Enums.StorageConversionType.SpotToWarehouseReceipt ||
            r.value == models.Enums.StorageConversionType.SpotToBill ||
            r.value == models.Enums.StorageConversionType.BillToSpot ||
            r.value == models.Enums.StorageConversionType.WarehouseReceiptToSpot;
    });

  //  self.convertTypes = models.EnumOptions.StorageConversionType;
    self.tradeTypes = models.EnumOptions.SimpleTradeType;
    
    self.defaultQuery = values.query;
    self.query = ko.mapping.fromJS(values.query);
    self.query.commodityId.subscribe(function (id) {
        for (var i = 0; i < models.AllCommodities.length; i++) {
            var commodity = models.AllCommodities[i];
            if (commodity.id == id) {
                self.accountingEntities(commodity.accountEntities.slice(0));
            }
        }
    });
    self.query.storageConversionType.subscribe(function (newVal) {
        if (newVal == models.Enums.StorageConversionType.SpotToExchangeReceipt || newVal == models.Enums.StorageConversionType.ExchangeReceiptToSpot) {
            self.exchangeDisable(false);
        } else
            self.exchangeDisable(true);

        if (newVal == models.Enums.StorageConversionType.BillToSpot) {
            self.targetDisable(false);
            self.targetWarehouses(models.AllWarehouses);
            self.sourceWarehouses(models.AllLogistics);
        } else
            if (newVal == models.Enums.StorageConversionType.SpotToBill) {
                self.targetDisable(false);
                self.sourceWarehouses(models.AllWarehouses);
                self.targetWarehouses(models.AllLogistics);
            }
            else {
                self.targetDisable(true);
                self.targetWarehouses(models.AllWarehouses);
                self.sourceWarehouses(models.AllWarehouses);
                self.query.targetWarehouseId(self.query.sourceWarehouseId());
            }
    });

    self.query.sourceWarehouseId.subscribe(function (newVal) {
        if (self.query.storageConversionType() == models.Enums.StorageConversionType.BillToSpot
             || self.query.storageConversionType() == models.Enums.StorageConversionType.SpotToBill) {
        } else {
            self.query.targetWarehouseId(newVal);
        }
    });

    self.finishModel = {
        isFinish: ko.observable(false),
        finishDate: ko.observable(),
        note: ko.observable(),
        oldItem: {}
    };

    self.pageSummary = {
        totalWeight: ko.observable(),
        count:ko.observable(0),
    };
    self.totalSummary = {
        totalWeight: ko.observable(),
        count: ko.observable(0),
    };
    
    function search() {
        base._get(options.searchUrl, ko.mapping.toJS(self.query), function (result) {
            self.fillItems(result);
        });
    }
    self.initialize = function () {
        search();
    };
    self.onSearch = function () {
        utils.responseStateChange(false);
        search();
    };
    self.fillItems = function (result) {
        self.items.removeAll();
        self.items(result.data.list);
        self.totalSummary.count(result.data.count);
        self.totalSummary.totalWeight(result.data.totalWeight);

        var totalWeight = 0,count = 0;
        $.each(result.data.list, function (i, item) {
            totalWeight += item.weight;
            count++;
        });

        self.pageSummary.totalWeight(totalWeight);
        self.pageSummary.count(count);

        base._paginate($("#pager"), result.data.page, function () {
            return $.extend(true, {}, ko.mapping.toJS(self.query));
        }, options.searchUrl, self.fillItems);
    };

    self.onDelete = function (item) {
        confirm("确定删除此项记录？", function () {
            base._post(options.deleteUrl, { id: item.wfStorageConversionId }, function (result) {
                search();
            });
        });
    };

    self.onPreFinish = function (item) {
        self.finishModel.isFinish(!item.isFinished);        
        self.finishModel.oldItem = item;
        return true;
    };
    self.onFinish = function (data,event) {
        var postData = {
            id: self.finishModel.oldItem.wfStorageConversionId,
            isFinish: self.finishModel.isFinish(),
            note: self.finishModel.note(),
            finishDate: self.finishModel.finishDate(),
        };
        base._post(options.finishUrl, postData, function (result) {
            if (result.Status) {
                $('#finishComfirmModal').modal('hide');
                search();
            } else {
                self.finishModel.isFinish(self.finishModel.oldItem.isFinished);
            }
        });
    };

    self.invalids = {
        finishError: ko.observable()
    };
    self.customShowErrors = ko.observable();
    utils.setCustomShowErrors(self.customShowErrors);
    self.setCustomShowErrors = {
        finishError: function () {
            self.customShowErrors(self.invalids.finishError);
        }
    };
};

GMK.StorageTransfer.ConvertRecords.DetailsViewModel = function (models, options, values) {
    var self = this;
    $.extend(self, models);
    self.commonModels = models;
    var base = GMK.Features.FeatureBase;
    self.item = {};
    self.initialize = function (callback) {
        if (values.id) {
            base._get(options.getUrl, { id: values.id }, function (result) {
                self.item = ko.mapping.fromJS(result);
                if (callback)
                    callback();
            });
        }
    };
};