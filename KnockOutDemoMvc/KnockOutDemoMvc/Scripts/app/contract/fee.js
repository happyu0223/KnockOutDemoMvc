var GMK = GMK || {};
GMK.ContractFee = GMK.ContractFee || {};
GMK.ContractFee.start = function (route, element, success) {
    GMK.Features.CommonModels.onReady(function (commonModels) {
        var viewModel;
        if (route.action === 'FeeIndex') {
            viewModel = new GMK.ContractFee.IndexViewModel(commonModels, route, {});
        }
        if (viewModel) {
            viewModel.initialize(function () {
                ko.applyBindings(viewModel, element);
                if (success) {
                    success(viewModel);
                }
            });
        }
    });
};
GMK.ContractFee.ItemViewModel = function (plainItem, root, option) {
    var self = $.extend(this, ko.mapping.fromJS(plainItem));
    var accountTitle = parseInt(self.FinanceAccount());
    if (!isNaN(accountTitle)) {
        self.FinanceAccount(accountTitle);
    }
    if (option && option.cumputeAccountTitle) {
        self.WFSystemFeeId.subscribe(function (newValue) {
            self.FinanceAccount(root.findFeeSysType(newValue).accountId);
        });
    }
    if (option && option.computeWarehouseId) {
        self.WarehouseStorageId.subscribe(function (newValue) {
            var storage = utils.find(root.contractStorages(), function (r) {
                return r.WFWarehouseStorageId() == newValue;
            });
            if (storage) {
                self.WarehouseId(storage.WarehouseId());
            }
        });
    }
    self.FeeType.subscribe(function (newValue) {
        if (newValue !== root.commonModels.Enums.ContractFeeType.Cost) {
            self.WFSystemFeeId(null);
            self.LogisticsCompanyId(null);
            self.WarehouseStorageId(null);
            self.WarehouseId(null);
        }
    });
    self.toJs = function () {
        return ko.mapping.toJS(self);
    };
};
GMK.ContractFee.IndexViewModel = function (commonModels, route, options) {
    var self = this;
    self.commonModels = commonModels;
    var base = GMK.Features.FeatureBase;
    var itemVM = GMK.ContractFee.ItemViewModel;
    self.contractId = route.values.contractId;
    self.contractCode = route.values.contractCode;
    self.contractIsBuy = route.values.contractIsBuy;
    self.summaryAll = ko.observable([]);
    self.summaryAllComputed = ko.computed(function () {
        var data = [
            {
                FeeType: commonModels.Enums.ContractFeeType.Cost,
                FeeSysTypeType: commonModels.Enums.CostFeeType.WarehouseFee,
                count: 0,
                sumAmount: 0,
                name: '仓库费'
            }, {
                FeeType: commonModels.Enums.ContractFeeType.Cost,
                FeeSysTypeType: commonModels.Enums.CostFeeType.Logistics,
                count: 0,
                sumAmount: 0,
                name: '物流费'
            }, {
                FeeType: commonModels.Enums.ContractFeeType.Cost,
                FeeSysTypeType: commonModels.Enums.CostFeeType.Others,
                count: 0,
                sumAmount: 0,
                name: '其他成本费用'
                //}, {
                //    FeeType: commonModels.Enums.ContractFeeType.PayableAccount,
                //    FeeSysTypeType: commonModels.Enums.CostFeeType.Others,
                //    count: 0,
                //    sumAmount: 0,
                //    name: '其他应付款'
                //}, {
                //    FeeType: commonModels.Enums.ContractFeeType.ReceivableAccount,
                //    FeeSysTypeType: commonModels.Enums.CostFeeType.Others,
                //    count: 0,
                //    sumAmount: 0,
                //    name: '其他应收款'
            }
        ];
        $.each(self.summaryAll(), function (i, r) {
            var dr = utils.find(data, function (r2) {
                return r.FeeType === r2.FeeType && r.FeeSysTypeType == r2.FeeSysTypeType;
            });
            if (dr) {
                dr.count = r.count;
                dr.sumAmount = r.sumAmount;
            }
        });
        return data;
    });
    self.warehouse = {};
    self.logistics = {};
    self.simple = {};
    self.generateFeeSysTypes = $.grep(commonModels.AllFee, function (r) {
        return r.AbleAutoGenerate === true;
    });
    self.warehouse.feeSysTypes = $.grep(commonModels.AllFee, function (r) {
        return r.feeType === commonModels.Enums.CostFeeType.WarehouseFee;
    });
    self.logistics.feeSysTypes = $.grep(commonModels.AllFee, function (r) {
        return r.feeType === commonModels.Enums.CostFeeType.Logistics;
    });
    self.simple.feeSysTypes = $.grep(commonModels.AllFee, function (r) {
        return r.feeType === commonModels.Enums.CostFeeType.Others || r.feeType === null;
    });
    self.initialize = function (callback) {
        self.loadStorages(function () {
            self.warehouse.search(callback);
        });
    };
    self.loadContract = function (callback) {
        if (self.contract) {
            callback();
        } else {
            base._get('Contract/Get', { id: self.contractId }, function (result) {
                self.contract = ko.mapping.fromJS(result);
                callback();
            });
        }
    };
    self.contractStorages = ko.observableArray();
    self.contractStoragesLoaded = ko.observable(false);
    self.contractStorageOptions = ko.observableArray();
    self.contractWarehouseOptions = ko.observableArray();
    self.computeWarehouseAndStorageOptions = function (storages) {
        var result = {};
        var warehouseIds = $.unique($.map(storages, function (r) {
            return r.WarehouseId();
        }));
        result.WarehouseOptions = $.grep(commonModels._AllWarehouses, function (r) {
            return $.inArray(r.id, warehouseIds) > -1;
        });
        result.StorageOptions = $.map(storages, function (r) {
            var opt = ko.mapping.toJS(r);
            opt.warehouseShortName = (utils.find(result.WarehouseOptions, function (r2) {
                return r.WarehouseId() === r2.id;
            }) || {}).shortName || '';
            opt.cardCode = r.GroupCode() || '';
            opt.commodityName = commonModels.findCommodity(r.CommodityId());
            opt.brandName = commonModels.findBrand(r.BrandId(), r.CommodityId());
            opt.specificationName = commonModels.findSpecification(r.SpecificationId(), r.CommodityId());
            //opt.AailableWeight = r.AailableWeight();
            opt.value = r.WFWarehouseStorageId();
            opt.text = '仓库：' + opt.warehouseShortName
                + '，卡号：' + opt.cardCode
                + '，货品：' + opt.commodityName
                + '，品牌：' + opt.brandName
                + '，型号：' + opt.specificationName
                + '，剩余重量：' + utils.formatDecimal(opt.AailableWeight, 4);
            return opt;
        });
        return result;
    };
    self.loadStorages = function (callback) {
        //self.loadContract(function () {
        if (self.contractStoragesLoaded()) {
            callback();
        } else {
            base._get('Contract/ListStorageByContract', { id: self.contractId }, function (result) {
                var data = ko.mapping.fromJS(result.Data)();
                self.contractStorages(data);
                var options = self.computeWarehouseAndStorageOptions(data);
                self.contractStorageOptions(options.StorageOptions);
                self.contractWarehouseOptions(options.WarehouseOptions);
                self.contractStoragesLoaded(true);
                callback();
            });
        }
        //});
    };
    self.findAccountTitle = function (value) {
        return (utils.find(commonModels.AllFinancialAccount, function (r) {
            return r.id === value;
        }) || {});
    };
    self.findFeeSysType = function (value) {
        return (utils.find(commonModels.AllFee, function (r) {
            return r.id === value;
        }) || {});
    };
    self.onGenerate = function (data, event) {
        var feeSysTypeType = data.feeType
        var currPane = feeSysTypeType === commonModels.Enums.CostFeeType.WarehouseFee
            ? self.warehouse
            : feeSysTypeType === commonModels.Enums.CostFeeType.Logistics
            ? self.logistics
            : self.simple;
        base._post('Contract/FeeGenerate', {
            contractId: self.contractId,
            feeSysType: data.id
        }, function (result) {
            currPane.loadItems();
            //location.reload(true);
        });
    };
    self.getAdjustItem = function (feeSysType, callback) {
        base._post('Contract/FeeGetAdjust', {
            contractId: self.contractId,
            feeSysType: feeSysType
        }, callback);
    };

    self.warehouse.query = ko.observable(ko.mapping.fromJS($.extend({}, route.values.warehouse.query)));
    self.warehouse.currQuery = ko.mapping.toJS(self.warehouse.query());
    self.warehouse.searchUrl = 'Contract/WarehouseFeeList';
    self.warehouse.items = ko.observableArray();
    //self.warehouse.storages = ko.observableArray();
    self.warehouse.findStorageText = function (value) {
        var storage = utils.find(self.contractStorageOptions(), function (r) {
            return value === r.value;
        });
        return storage
            ? '卡号：' + storage.cardCode
            + '，品牌：' + storage.brandName
            + '，型号：' + storage.specificationName
            + '，剩余重量：' + utils.formatDecimal(storage.AailableWeight, 4)
            : '';
    };
    self.warehouse.summary = ko.computed(function () {
        var sum = { Amount: 0 };
        $.each(self.warehouse.items(), function (i, r) {
            sum.Amount = utils.roundAmount(sum.Amount + r.Amount());
        });
        return sum;
    });
    self.warehouse.summaryAll = ko.observable({});
    self.warehouse.isEditing = ko.observable(false);
    self.warehouse.isCreating = ko.observable(false);
    self.warehouse.isAdjusting = ko.observable(false);
    self.warehouse.currItem = null;
    self.warehouse.editingItem = ko.observable(new itemVM(route.values.newItem, self));
    self.warehouse.onSearch = function () {
        self.warehouse.search();
    };
    self.warehouse.search = function (callback) {
        self.warehouse.query().Pagination.CurrentPage(1);
        self.warehouse.currQuery = ko.mapping.toJS(self.warehouse.query());
        self.warehouse.loadItems(callback);
    };
    self.warehouse.loadItems = function (callback) {
        base._post(self.warehouse.searchUrl, self.warehouse.currQuery, function (result) {
            self.warehouse.fillItems(result);
            if (callback) {
                callback();
            }
        });
    };
    self.warehouse.fillItems = function (result) {
        self.warehouse.currQuery.Pagination.CurrentPage = result.Data.pagination.CurrentPage || result.Data.pagination.currentPage || self.warehouse.currQuery.Pagination.CurrentPage;
        self.warehouse.currQuery.Pagination.PageCount = result.Data.pagination.PageCount || result.Data.pagination.pageCount || self.warehouse.currQuery.Pagination.PageCount;
        self.warehouse.query(ko.mapping.fromJS(self.warehouse.currQuery));
        var items = $.map(result.Data.list, function (r) {
            return new itemVM(r, self);
        });
        self.warehouse.items(items);
        self.warehouse.summaryAll(result.Data.summary);
        self.summaryAll(result.Data.summaryAll);
        //self.warehouse.storages(result.Data.storages);
        base._pagination($(route.values.warehouse.pager), self.warehouse.currQuery.Pagination.CurrentPage, function (newPage) {
            self.warehouse.currQuery.Pagination.CurrentPage = newPage;
            self.warehouse.loadItems();
        });
        //base._paginate($(route.values.warehouse.pager), $.extend(true, {}, self.warehouse.currQuery.Pagination), function () {
        //    return $.extend(true, {}, self.warehouse.currQuery);
        //}, self.warehouse.searchUrl, self.warehouse.fillItems, function (q, p) {
        //    self.warehouse.currQuery.Pagination.CurrentPage = parseInt(p.currentPage || p.CurrentPage || 1);
        //    return $.extend(true, {}, self.warehouse.currQuery);
        //});
    };
    self.warehouse.toAdjust = function (data) {
        self.loadStorages(function () {
            self.getAdjustItem(data.id, function (result) {
                var item = new itemVM(result.Data, self);
                self.warehouse.isAdjusting(true);
                item.FeeType(commonModels.Enums.ContractFeeType.Cost);
                item.WFSystemFeeId(data.id);
                if (!item.WFContractFeeId()) {
                    item.FinanceAccount(self.findFeeSysType(item.WFSystemFeeId()).accountId);
                }
                item.IsAdjust(true);
                self.warehouse.editingItem(item);
                self.warehouse.isEditing(true);
            });
        });
    };
    self.warehouse.toCreate = function () {
        self.loadStorages(function () {
            var newItem = new itemVM(route.values.newItem, self, { cumputeAccountTitle: true, computeWarehouseId: true });
            self.warehouse.isCreating(true);
            newItem.FeeType(commonModels.Enums.ContractFeeType.Cost);
            newItem.WFSystemFeeId(self.warehouse.currQuery.FeeSysType);
            newItem.FinanceAccount(self.findFeeSysType(newItem.WFSystemFeeId()).accountId);
            self.warehouse.editingItem(newItem);
            self.warehouse.isEditing(true);
            //$(route.values.warehouse.editForm).validate().resetForm();
        });
    };
    self.warehouse.toUpdate = function (item) {
        self.loadStorages(function () {
            self.warehouse.currItem = item;
            self.warehouse.isCreating(false);
            self.warehouse.editingItem(new itemVM(item.toJs(), self, { computeWarehouseId: true }));
            self.warehouse.isEditing(true);
            //$(route.values.warehouse.editForm).validate().resetForm();
        });
    };
    self.warehouse.onSave = function () {
        var plainItem = self.warehouse.editingItem().toJs();
        if (self.warehouse.isAdjusting()) {
            base._post('Contract/FeeSaveAdjust', plainItem, function (result) {
                self.warehouse.loadItems(self.warehouse.cancelEdit);
            });
        } else if (self.warehouse.isCreating()) {
            base._post('Contract/FeeCreate', plainItem, function (result) {
                //var newItem = new itemVM(result.Data, self);
                //self.warehouse.items.push(newItem);
                self.warehouse.loadItems(self.warehouse.cancelEdit);
            });
        } else {
            base._post('Contract/FeeUpdate', plainItem, function (result) {
                //var newItem = new itemVM(result.Data, self);
                //self.warehouse.items.replace(self.warehouse.currItem, newItem);
                self.warehouse.loadItems(self.warehouse.cancelEdit);
            });
        }
    };
    self.warehouse.cancelEdit = function () {
        $(route.values.warehouse.editForm).validate().resetForm();
        self.warehouse.isEditing(false);
        self.warehouse.isCreating(false);
        self.warehouse.isAdjusting(false);
        $(route.values.warehouse.modal).modal('hide');
    };
    self.warehouse.onDelete = function (item) {
        confirm('确定要删除？', function () {
            base._post('Contract/FeeDelete', { feeId: item.WFContractFeeId() }, function (data) {
                //self.warehouse.items.remove(item);
                self.warehouse.loadItems();
            });
            self.warehouse.isEditing(false);
        });
    };

    self.logistics.loaded = ko.observable(false);
    self.logistics.onActive = function () {
        if (!self.logistics.loaded()) {
            self.logistics.search(function () {
                self.logistics.loaded(true);
            });
        }
    };
    self.logistics.query = ko.observable(ko.mapping.fromJS($.extend({}, route.values.logistics.query)));
    self.logistics.currQuery = ko.mapping.toJS(self.logistics.query());
    self.logistics.searchUrl = 'Contract/LogisticsFeeList';
    self.logistics.items = ko.observableArray();
    self.logistics.summary = ko.computed(function () {
        var sum = { Amount: 0 };
        $.each(self.logistics.items(), function (i, r) {
            sum.Amount = utils.roundAmount(sum.Amount + r.Amount());
        });
        return sum;
    });
    self.logistics.summaryAll = ko.observable({});
    self.logistics.isEditing = ko.observable(false);
    self.logistics.isCreating = ko.observable(false);
    self.logistics.isAdjusting = ko.observable(false);
    self.logistics.currItem = null;
    self.logistics.editingItem = ko.observable(new itemVM(route.values.newItem, self));
    self.logistics.onSearch = function () {
        self.logistics.search();
    };
    self.logistics.search = function (callback) {
        self.logistics.query().Pagination.CurrentPage(1);
        self.logistics.currQuery = ko.mapping.toJS(self.logistics.query());
        self.logistics.loadItems(callback);
    };
    self.logistics.loadItems = function (callback) {
        base._post(self.logistics.searchUrl, self.logistics.currQuery, function (result) {
            self.logistics.fillItems(result);
            if (callback) {
                callback();
            }
        });
    };
    self.logistics.fillItems = function (result) {
        self.logistics.currQuery.Pagination.CurrentPage = result.Data.pagination.CurrentPage || result.Data.pagination.currentPage || self.logistics.currQuery.Pagination.CurrentPage;
        self.logistics.currQuery.Pagination.PageCount = result.Data.pagination.PageCount || result.Data.pagination.pageCount || self.logistics.currQuery.Pagination.PageCount;
        self.logistics.query(ko.mapping.fromJS(self.logistics.currQuery));
        var items = $.map(result.Data.list, function (r) {
            return new itemVM(r, self);
        });
        self.logistics.items(items);
        self.logistics.summaryAll(result.Data.summary);
        self.summaryAll(result.Data.summaryAll);
        //base._pagination($(route.values.logistics.pager),);
        base._paginate($(route.values.logistics.pager), $.extend(true, {}, self.logistics.currQuery.Pagination), function () {
            return $.extend(true, {}, self.logistics.currQuery);
        }, self.logistics.searchUrl, self.logistics.fillItems, function (q, p) {
            self.logistics.currQuery.Pagination.CurrentPage = parseInt(p.currentPage || p.CurrentPage || 1);
            return $.extend(true, {}, self.logistics.currQuery);
        });
    };
    self.logistics.toAdjust = function (data) {
        self.loadStorages(function () {
            self.getAdjustItem(data.id, function (result) {
                var item = new itemVM(result.Data, self);
                self.logistics.isAdjusting(true);
                item.FeeType(commonModels.Enums.ContractFeeType.Cost);
                item.WFSystemFeeId(data.id);
                if (!item.WFContractFeeId()) {
                    item.FinanceAccount(self.findFeeSysType(item.WFSystemFeeId()).accountId);
                }
                item.IsAdjust(true);
                self.logistics.editingItem(item);
                self.logistics.isEditing(true);
            });
        });
    };
    self.logistics.toCreate = function () {
        self.loadStorages(function () {
            var newItem = new itemVM(route.values.newItem, self, { cumputeAccountTitle: true });
            self.logistics.isCreating(true);
            newItem.FeeType(commonModels.Enums.ContractFeeType.Cost);
            var feeSysType = self.logistics.currQuery.FeeSysType;
            if (!feeSysType && self.logistics.feeSysTypes.length === 1) {
                feeSysType = self.logistics.feeSysTypes[0].id;
            }
            newItem.WFSystemFeeId(feeSysType);
            newItem.FinanceAccount(self.findFeeSysType(newItem.WFSystemFeeId()).accountId);
            self.logistics.editingItem(newItem);
            self.logistics.isEditing(true);
        });
    };
    self.logistics.toUpdate = function (item) {
        self.loadStorages(function () {
            self.logistics.currItem = item;
            self.logistics.isCreating(false);
            self.logistics.editingItem(new itemVM(item.toJs(), self));
            self.logistics.isEditing(true);
        });
    };
    self.logistics.onSave = function () {
        var plainItem = self.logistics.editingItem().toJs();
        if (self.logistics.isAdjusting()) {
            base._post('Contract/FeeSaveAdjust', plainItem, function (result) {
                self.logistics.loadItems(self.logistics.cancelEdit);
            });
        } else if (self.logistics.isCreating()) {
            base._post('Contract/FeeCreate', plainItem, function (result) {
                //var newItem = new itemVM(result.Data, self);
                //self.logistics.items.push(newItem);
                self.logistics.loadItems(self.logistics.cancelEdit);
            });
        } else {
            base._post('Contract/FeeUpdate', plainItem, function (result) {
                //var newItem = new itemVM(result.Data, self);
                //self.logistics.items.replace(self.logistics.currItem, newItem);
                self.logistics.loadItems(self.logistics.cancelEdit);
            });
        }
    };
    self.logistics.cancelEdit = function () {
        $(route.values.logistics.editForm).validate().resetForm();
        self.logistics.isEditing(false);
        self.logistics.isCreating(false);
        self.logistics.isAdjusting(false);
        $(route.values.logistics.modal).modal('hide');
    };
    self.logistics.onDelete = function (item) {
        confirm('确定要删除？', function () {
            base._post('Contract/FeeDelete', { feeId: item.WFContractFeeId() }, function (data) {
                //self.logistics.items.remove(item);
                self.logistics.loadItems();
            });
            self.logistics.isEditing(false);
        });
    };

    self.simple.query = ko.observable(ko.mapping.fromJS($.extend({}, route.values.simple.query)));
    self.simple.currQuery = ko.mapping.toJS(self.simple.query());
    self.simple.items = ko.observableArray();
    self.simple.summary = ko.computed(function () {
        var sum = { Amount: 0 };
        $.each(self.simple.items(), function (i, r) {
            sum.Amount = utils.roundAmount(sum.Amount + r.Amount());
        });
        return sum;
    });
    self.simple.isEditing = ko.observable(false);
    self.simple.isCreating = ko.observable(false);
    self.simple.currItem = null;
    self.simple.editingItem = ko.observable(new itemVM(route.values.newItem, self));
    self.simple.loaded = ko.observable(false);
    self.simple.onActive = function () {
        if (!self.simple.loaded()) {
            self.simple.search(function () {
                self.simple.loaded(true);
            });
        }
    };
    self.simple.onSearch = function () {
        self.simple.search();
    };
    //self.simple.loadItems = function (callback) {
    //    base._get('Contract/OtherFeeList', { contractId: self.contractId }, function (result) {
    //        self.simple.items($.map(result.Data, function (r) {
    //            return new itemVM(r, self);
    //        }));
    //        if (callback) {
    //            callback();
    //        }
    //    });
    //};
    self.simple.searchUrl = 'Contract/OtherFeeList';
    self.simple.search = function (callback) {
        self.simple.currQuery = ko.mapping.toJS(self.simple.query());
        self.simple.loadItems(callback);
    };
    self.simple.loadItems = function (callback) {
        base._post(self.simple.searchUrl, self.simple.currQuery, function (result) {
            self.simple.fillItems(result);
            if (callback) {
                callback();
            }
        });
    };
    self.simple.fillItems = function (result) {
        self.simple.query(ko.mapping.fromJS(self.simple.currQuery));
        var items = $.map(result.Data.list, function (r) {
            return new itemVM(r, self);
        });
        self.simple.items(items);
        //self.simple.summaryAll(result.Data.summary);
        self.summaryAll(result.Data.summaryAll);
        //base._paginate($(route.values.simple.pager), $.extend(true, {}, self.simple.currQuery.Pagination), function () {
        //    return $.extend(true, {}, self.simple.currQuery);
        //}, self.simple.searchUrl, self.simple.fillItems, function (q, p) {
        //    self.simple.currQuery.Pagination.CurrentPage = p.currentPage || p.CurrentPage || 1;
        //    return $.extend(true, {}, self.simple.currQuery);
        //});
    };

    self.simple.toCreate = function () {
        var newItem = new itemVM(route.values.newItem, self, { cumputeAccountTitle: true });
        self.simple.isCreating(true);
        newItem.FeeType(self.simple.currQuery.FeeType);
        newItem.WFSystemFeeId(self.simple.currQuery.FeeSysType);
        newItem.FinanceAccount(self.findFeeSysType(newItem.WFSystemFeeId()).accountId);
        self.simple.editingItem(newItem);
        self.simple.isEditing(true);
    };
    self.simple.toUpdate = function (item) {
        self.simple.currItem = item;
        self.simple.isCreating(false);
        self.simple.editingItem(new itemVM(item.toJs(), self));
        self.simple.isEditing(true);
    };
    self.simple.onSave = function () {
        var plainItem = self.simple.editingItem().toJs();
        if (self.simple.isCreating()) {
            base._post('Contract/FeeCreate', plainItem, function (result) {
                //var newItem = new itemVM(result.Data, self);
                //self.simple.items.push(newItem);
                self.simple.loadItems(self.simple.cancelEdit);
            });
        } else {
            base._post('Contract/FeeUpdate', plainItem, function (result) {
                //var newItem = new itemVM(result.Data, self);
                //self.simple.items.replace(self.simple.currItem, newItem);
                self.simple.loadItems(self.simple.cancelEdit);
            });
        }
    };
    self.simple.cancelEdit = function () {
        $(route.values.simple.editForm).validate().resetForm();
        self.simple.isEditing(false);
        self.simple.isCreating(false);
        $(route.values.simple.modal).modal('hide');
    };
    self.simple.onDelete = function (item) {
        confirm('确定要删除？', function () {
            base._post('Contract/FeeDelete', { feeId: item.WFContractFeeId() }, function (data) {
                //self.simple.items.remove(item);
                self.simple.loadItems();
            });
            self.simple.isEditing(false);
        });
    };
};

