"use strict";
var ns = utils.namespace('GMK.Warehouse');
ns.start = function (route, element, success) {
    GMK.Features.CommonModels.onReady(function (commonModels) {
        var viewModel;
        if (route.action === 'EntryWizard') {
            route.values.newContractDetail.isSelected = false;
            viewModel = new ns.EntryWizard(commonModels, route, {
                listCardCodeUrl: 'WarehouseInfo/ListCardCode',
                isCardCodeGenerationRequiredUrl: 'WarehouseInfo/IsCardCodeGenerationRequired',
            });
        }
        if (viewModel) {
            // window.vm = viewModel;
            viewModel.initialize(function () {
                ko.applyBindings(viewModel, element);
                commonModels.registerQueryFormEvent('.collapse-query');
                if (success) {
                    success(viewModel);
                }
            });
        }
    });
};

/**
 * FirstTab:选择移仓收货记录
 * 在初始化列表选择后，没有直接使用被选中的item。而是重新拉取一遍是为了通用直接通过objectId进入
 */
var SelectedTransferViewModel = function (commonModels, route, root) {
    var self = this;
    var base = GMK.Features.FeatureBase;
    self.toquery = {
        DeliveryOrderCode: ko.observable(),
        CustomerId: ko.observable(),
        WarehouseId: ko.observable(),
        CommodityId: ko.observable(),
        DateRange: ko.observable()
    };
    self.queried = ko.observable({});
    self.items = ko.observableArray();
    self.onSearch = function () {
        var param = ko.toJS(self.toquery);
        base._get('Warehouse/ListTransfers', param, function (result) {
            self.queried(param);
            self.items(result.Data);
        });
    };
    //选择移仓记录
    self.select = function (outRecordId, callback) {
        base._get('Warehouse/GetWarehouseOutRecord', { id: outRecordId }, function (result) {
            var record = result.Data.record;
            if (route.values.isCreate) {
                root.item.CommodityId(record.CommodityId);
                root.item.CustomerId(window.corporationId);
                root.item.WhStorageType(record.WhStorageType);
                root.item.EntryType(commonModels.Enums.WarehouseEntryType.LogisticsEntry);
                root.item.AccountingEntityId(record.AccountEntityId);
                root.item.TransferWarehouseId(record.WarehouseId);
                self.initDetails(result.Data.details,record);
            }
            root.tabs.first.transfer(record);
            if (callback) {
                callback();
            }
        });
    };
    self.initDetails = function (details, record) {
        var ignoreMapping = {
            'ignore': ["WFStorageAssistantMeasureInfoes"]
        };
        var initDetails = $.map(details, function (r) {
            var detail = ko.mapping.fromJS(r, ignoreMapping);
            $.each((r.WFStorageAssistantMeasureInfoes || []), function (i, info) {
                if (info.SubMeasureType == commonModels.Enums.SubMeasureType.Bundle) {
                    detail.Bundles(info.Quantity);
                    detail.BundlesMeasureInfoId(info.WFStorageAssistantMeasureInfoId);
                }
                if (info.SubMeasureType == commonModels.Enums.SubMeasureType.GrossWeight) {
                    detail.GrossWeight(info.Quantity);
                    detail.GrossWeightMeasureInfoId(info.WFStorageAssistantMeasureInfoId);
                }
            });

            if (!detail.WFContractEntryRecordDetails() || !detail.WFContractEntryRecordDetails().length) {
                var contractDetail = $.extend({}, route.values.newContractDetail);
                for (var p in contractDetail) if (p in detail) contractDetail[p] = detail[p];
                detail.ObjectId = record.WFWarehouseOutRecordId;
                detail.ObjectType = commonModels.Enums.SendReceiveObjectType.TransferWarehouse;
                detail.WFContractEntryRecordDetails.push(ko.mapping.fromJS(contractDetail));
            } else {
                $.each(detail.WFContractEntryRecordDetails(), function (i, r) {
                    if (!('isSelected' in r)) r.isSelected = ko.observable(false);
                });
            }
            
            return detail;
        });
        if (root.isByPiece()) {
            root.tabs.entry.details(initDetails || []);
            root.tabs.entry.piece.storages.removeAll();
        } else {
            root.tabs.entry.details(initDetails || []);
        }
    };
    self.onFinish = function (r) {
        self.select(r.WFWarehouseOutRecordId, function () {
            $('#selectTransfer').modal('hide');
        });
    };
};

/**
 * FirstTab:选择货物转移收货
 */
var SelectedStorageConvertViewModel = function (commonModels, route, root) {
    var self = this;
    var base = GMK.Features.FeatureBase;
    self.toquery = {
        Code: ko.observable(),
        StorageConversionType: ko.observable(),
        TargetWarehouseId: ko.observable(),
        CommodityId: ko.observable(),
        DateRange: ko.observable(),
        WarehouseEntryHappened: ko.observable(false),
        WarehouseOutHappened: ko.observable(true),
        StartDate: ko.observable(),
        EndDate: ko.observable(),
    };
    self.queried = ko.observable({});
    self.items = ko.observableArray();
    self.isAllowNew = ko.observable(false);
    self.convertType = ko.observable(commonModels.Enums.InventoryStorageType.Spot);
    var bundleUnit = $.grep(commonModels.AllUnits, function (r) {
        return r.code == "Bundle";
    });
    self.onSearch = function () {
        var param = ko.toJS(self.toquery);
        if (param.DateRange != null) {
            param.StartDate = param.DateRange.split(' - ')[0];
            param.EndDate = param.DateRange.split(' - ')[1];
        }
        base._get('Warehouse/ListStorageConvert', param, function (result) {
            self.queried(param);
            self.items(result.Data);
        });
    };
    self.onFinish = function (item) {
        root.item.CommodityId(item.CommodityId);
        root.item.CustomerId(item.SourceWarehouseId);
        root.item.WarehouseId(item.TargetWarehouseId);
        root.item.WhStorageType(item.TargetStorageType);
        root.item.AccountingEntityId(item.AccountEntityId);
        //如果是交易所仓单，设置ExchangeId
        if (root.item.WhStorageType() == commonModels.Enums.InventoryStorageType.Receipt)
            root.item.ExchangeId(item.ExchangeId);
        root.tabs.first.storageConvert(item);

        self.initEntryDetails(item.WFStorageConversionId, true);
        $('#selectStorageConvert').modal('hide');
    };
    self.initEntryDetails = function (objectId, isCreate) {
        base._get('Warehouse/GetInitialDetailsFromStorageConvert', { id: objectId }, function (result) {
            var list = result.Data.details;
            self.isAllowNew(result.Data.isAddAllowed);
            if (isCreate) {
                var details = [];
                var ignoreMapping = {
                    'ignore': ["WFStorageAssistantMeasureInfoes"]
                };
                $.each(list, function (i, item) {
                    var detail = ko.mapping.fromJS(item, ignoreMapping);
                    if (!detail.WFContractEntryRecordDetails() || !detail.WFContractEntryRecordDetails().length) {
                        var contractDetail = $.extend({}, route.values.newContractDetail);
                        for (var p in contractDetail) if (p in detail) contractDetail[p] = detail[p];
                        detail.WFContractEntryRecordDetails.push(ko.mapping.fromJS(contractDetail));
                    }
                    $.each((item.WFStorageAssistantMeasureInfoes || []), function (i, info) {
                        if (info.SubMeasureType == commonModels.Enums.SubMeasureType.Bundle) {
                            detail.Bundles(info.Quantity);
                            detail.BundlesMeasureInfoId(info.WFStorageAssistantMeasureInfoId);
                        }
                        if (info.SubMeasureType == commonModels.Enums.SubMeasureType.GrossWeight) {
                            detail.GrossWeight(info.Quantity);
                            detail.GrossWeightMeasureInfoId(info.WFStorageAssistantMeasureInfoId);
                        }
                    });
                    details.push(detail);
                });
                //发货记录和收货记录的转换
                root.tabs.entry.details(details);
                root.tabs.entry.storageConvert.details(details);
            }
        });
    };

    self.initByObjectId = function (id, isCreate, callback) {
        base._get('Warehouse/GetStorageConvetForEntry', { id: id }, function (result) {
            var data = result.Data;
            if (isCreate) {
                root.item.CommodityId(data.CommodityId);
                root.item.CustomerId(data.SourceWarehouseId);
                root.item.WarehouseId(data.TargetWarehouseId);
                root.item.WhStorageType(data.TargetStorageType);
                root.item.AccountingEntityId(data.AccountEntityId);
                //如果是交易所仓单，设置ExchangeId
                if (root.item.WhStorageType() == commonModels.Enums.InventoryStorageType.Receipt)
                    root.item.ExchangeId(data.ExchangeId);
            }
            root.tabs.first.storageConvert(data);
            self.initEntryDetails(id, isCreate);
            if (callback) {
                callback();
            }
        });
    };
};

/**
 * FirstTab:选择合同收货
 */
var SelectedContractViewModel = function (commonModels, route, root) {
    var self = this;
    var base = GMK.Features.FeatureBase;
    self.toquery = {
        IsBuy: true,
        ContractType: ko.observable(),
        CommodityId: ko.observable(),
        ContractCode: ko.observable(),
        CustomerId: ko.observable(),
        DateRange: ko.observable(),
        AccountingEntityId: ko.observable(),
    };
    self.queried = ko.observable({});
    self.items = ko.observableArray();
    self.hasPledgeContract = ko.observable(false);

    self.accountingEntities = ko.computed(function () {
        var commodity = commonModels.findById(commonModels.AllCommodities, self.toquery.CommodityId());
        if (commodity)
            return commodity.accountingEntities.slice() || [];
        else
            return [];
    });

    self.fillContracts = function (list) {
        var items = $.map(list, function (r) {
            return $.extend(ko.mapping.fromJS(r), { isSelected: ko.observable(false), isShowDetail: ko.observable(false) });
        });
        $.each(items, function (i1, r1) {
            $.each(r1.WFContractDetailInfoes(), function (i2, r2) {
                r2.detailPartText = commonModels.findBrand(r2.BrandId()) + '-' + r2.Weight() + "-" + (r2.ActualPrice() || r2.Price()) + '-' + r2.DeliveryAddress();
                r2.detailText = r1.ContractCode() + '-' + r2.detailPartText;
            });
        });
        self.items(items);
    };
    self.onSearch = function () {
        var param = ko.toJS(self.toquery);
        base._get('Warehouse/ListContracts', param, function (result) {
            self.queried(param);
            self.fillContracts(result);
        });
    };
    self.selectedItems = ko.computed(function () {
        return $.grep(self.items(), function (r) {
            return r.isSelected();
        });
    });

    self.searchBtnDisable = ko.computed(function () {
        var hasPledge = $.grep(self.selectedItems(), function (r) {
            return r.ContractType() == commonModels.Enums.ContractType.PledgeContract;
        });
        if (hasPledge.length > 0) {
            return self.selectedItems().length == 1;
        } else
            return self.selectedItems().length > 0;
    });

    self.finish = function (fromEvent) {
        var contracts = self.selectedItems();
        //如果选择的是赎回合同；从服务器端返回类型数据
        var hasPledge = $.grep(self.selectedItems(), function (r) {
            return r.ContractType() == commonModels.Enums.ContractType.PledgeContract;
        });
        if (hasPledge.length > 0) {
            base._get('Warehouse/GetAvilableReceiveType', { id: hasPledge[0].WFContractInfoId() }, function (result) {
                if (result.Data.list && result.Data.list.length > 0) {
                    root.item.WhStorageType(result.Data.list[0]);
                }
            });
        }
        if (fromEvent) {
            root.item.CommodityId(self.queried().CommodityId);
            root.item.CustomerId(self.queried().CustomerId);
        }
        var firstDetail = contracts[0] && contracts[0].WFContractDetailInfoes()[0];
        if (firstDetail && route.values.isCreate) {
            root.item.CommodityId(contracts[0].CommodityId());
            root.item.CustomerId(contracts[0].CustomerId());
            root.item.WhStorageType(firstDetail.IsSpot() ? commonModels.Enums.InventoryStorageType.Spot : commonModels.Enums.InventoryStorageType.Receipt);
            if (root.tabs.entry.details().length === 0) {
                var warehouse = utils.find(commonModels._AllWarehouses, function (r) {
                    return firstDetail.DeliveryAddress() === r.shortName;
                });
                if (warehouse) {
                    root.item.WarehouseId(warehouse.id);
                }
            }
            root.item.AccountingEntityId(contracts[0].AccountingEntityId());
        }
        root.tabs.first.contracts(contracts);
    };
    self.onFinish = function () {
        self.finish(true);
    };
    self.selectedSingleContract = function (contractId, callback) {
        base._get('Warehouse/GetContractById', { id: contractId }, function (result) {
            self.fillContracts([result.Data]);
            $.each(self.items(), function (i, r) {
                r.isSelected(true);
            });
            if (callback) {
                callback();
            }
            self.finish();
        });
    };
    self.loadFromRecord = function (contractDetailIds, callback) {
        base._post('Warehouse/ListContractsByDetailIds', { contractDetailIds: contractDetailIds }, function (result) {
            self.fillContracts(result.Data);
            $.each(self.items(), function (i, r) {
                r.isSelected(true);
            });
            self.finish();
            if (callback) {
                callback();
            }
        });
    };
};

/**
 * EntryTab:计重现货收货--普通现货；仓库仓单；海运提单
 */
var SpotViewModel = function (route, owner, root) {
    var spot = this;
    spot.detailsSummary = ko.computed(function () {
        var summary = { Weight: 0, ActualWeight: 0 };
        var p = owner.weightPrecision();
        $.each(owner.details(), function (i, r) {
            summary.Weight = utils.roundWeight(summary.Weight + utils.roundWeight(r.Weight(), p), p);
            summary.ActualWeight = utils.roundWeight(summary.ActualWeight + utils.roundWeight(r.ActualWeight(), p), p);
        });
        return summary;
    });

    spot.newDetail = ko.mapping.fromJS(route.values.newDetail);
    spot.newDetail.Weight.subscribe(function (newVal) {
        if (newVal && !isNaN(newVal))
            spot.newDetail.ActualWeight(newVal);
    });
    spot.editingDetail = null;
    spot.updatingDetail = ko.mapping.fromJS(route.values.newDetail);
    spot.onAddDetail = function () {
        spot.newDetail.CommodityId(root.item.CommodityId());
        spot.newDetail.UnitId(root.item.UnitId());
        var detail = ko.mapping.fromJS(ko.mapping.toJS(spot.newDetail));
        if (!detail.WFContractEntryRecordDetails() || !detail.WFContractEntryRecordDetails().length) {
            var contractDetail = $.extend({}, route.values.newContractDetail);
            for (var p in contractDetail) if (p in detail) contractDetail[p] = detail[p];
            detail.WFContractEntryRecordDetails.push(ko.mapping.fromJS(contractDetail));
        }
        owner.details.push(detail);
    };
    spot.onRemoveDetail = function (d) {
        owner.details.remove(d);
    };
    spot.toEditDetail = function (d) {
        spot.editingDetail = d;
        var plain = ko.mapping.toJS(d);
        ko.mapping.fromJS(plain, spot.updatingDetail);
    };
    spot.onEditDetail = function () {
        var oldCardCode = spot.editingDetail.CardCode();
        var plain = ko.mapping.toJS(spot.updatingDetail);
        ko.mapping.fromJS(plain, spot.editingDetail);
        $.each(spot.editingDetail.WFContractEntryRecordDetails(), function (i, cd) {
            cd.CardCode(plain.CardCode);
        });
        spot.editingDetail = null;
        if (spot.isBatchCardCode()) {
            $.each(owner.details(), function (i, r) {
                if (r.BrandId() === plain.BrandId && r.CardCode() === oldCardCode) {
                    r.CardCode(plain.CardCode);
                    $.each(r.WFContractEntryRecordDetails(), function (i, cd) {
                        cd.CardCode(plain.CardCode);
                    });
                }
            });
            spot.isBatchCardCode(false);
        }
        $('#spotEditDetail').modal('hide');
    };
    spot.isBatchCardCode = ko.observable(false);
    spot.reset = function () {
        owner.details.removeAll();
    };
};

/**
 *  EntryTab:计件现货收货
 */
var PieceViewModel = function (route, owner, root) {
    var piece = this;
    var base = GMK.Features.FeatureBase;
    piece.detailsSummary = ko.computed(function () {
        var summary = { Weight: 0, ActualWeight: 0 };
        var p = owner.weightPrecision();
        $.each(owner.details(), function (i, r) {
            summary.Weight = utils.roundWeight(summary.Weight + utils.roundWeight(r.Weight(), p), p);
            summary.ActualWeight = utils.roundWeight(summary.ActualWeight + utils.roundWeight(r.ActualWeight(), p), p);
        });
        return summary;
    });
    piece.editingDetail = null;
    piece.updatingDetail = ko.mapping.fromJS(route.values.newDetail);
    piece.toquery = {
        BrandId: ko.observable(),
        SpecificationId: ko.observable()
    };
    piece.storages = ko.observableArray();
    piece.onSearch = function () {
        var param = $.extend(ko.toJS(piece.toquery), {
            WarehouseId: root.item.WarehouseId(),
            CommodityId: root.item.CommodityId(),
            IsSpot: true,
            AccountEntityId: root.item.AccountingEntityId(),
        });
        base._get('Warehouse/ListPieces', param, function (result) {
            var detailsStorageIds = $.map(owner.details(), function (r) {
                return r.WFWarehouseStorageId();
            });
            var storages = $.grep(result.Data, function (r) {
                return $.inArray(r.WFWarehouseStorageId, detailsStorageIds) === -1;
            }).slice();
            $.each(storages, function (i, r) {
                r.isSelected = ko.observable(false);
            });
            piece.storages(storages);
        });
    };
    piece.selectedStorages = ko.computed(function () {
        var list = $.grep(piece.storages(), function (r) {
            return r.isSelected();
        });
        var summary = { Weight: 0 };
        var p = owner.weightPrecision();
        $.each(list, function (i, r) {
            summary.Weight = utils.roundWeight(summary.Weight + utils.roundWeight(r.Weight, p), p);
        });
        return { list: list, summary: summary };
    });
    piece.toAddDetails = function () {
        piece.storages.removeAll();
    };
    piece.onAddDetails = function () {
        var storages = piece.selectedStorages().list;
        var details = $.map(storages, function (r) {
            var existItem = $.grep(owner.details(), function (item) {
                return item.WFWarehouseStorageId() == r.WFWarehouseStorageId;
            });
            if (existItem.length == 0) {
                var detail = ko.mapping.fromJS(route.values.newDetail);
                detail.CommodityId(root.item.CommodityId());
                detail.UnitId(root.item.UnitId());
                detail.BrandId(r.BrandId);
                detail.SpecificationId(r.SpecificationId);
                detail.Weight(r.Weight);
                detail.ActualWeight(r.Weight);
                //detail.WeightMemoCode(r.WeightMemoCode);
                //detail.CardCode(r.CardCode);
                detail.WeightMemoCode(r.StorageCode);
                detail.CardCode(r.GroupCode);
                detail.Note(r.Note);
                detail.WFWarehouseStorageId(r.WFWarehouseStorageId);
                if (!detail.WFContractEntryRecordDetails() || !detail.WFContractEntryRecordDetails().length) {
                    var contractDetail = $.extend({}, route.values.newContractDetail);
                    for (var p in contractDetail) if (p in detail) contractDetail[p] = detail[p];
                    detail.WFContractEntryRecordDetails.push(ko.mapping.fromJS(contractDetail));
                }
                return detail;
            }
        });
        owner.details(owner.details().concat(details));
        //  piece.storages.removeAll();
    };
    piece.onRemoveDetail = function (detail) {
        owner.details.remove(detail);
    };
    piece.toEditDetail = function (detail) {
        piece.editingDetail = detail;
        var plain = ko.mapping.toJS(detail);
        ko.mapping.fromJS(plain, piece.updatingDetail);
    };
    piece.onEditDetail = function () {
        var oldCardCode = piece.editingDetail.CardCode();
        var cardCode = piece.updatingDetail.CardCode();
        var brandId = piece.updatingDetail.BrandId();
        var plain = ko.mapping.toJS(piece.updatingDetail);
        ko.mapping.fromJS(plain, piece.editingDetail);
        piece.editingDetail = null;
        if (piece.isBatchCardCode()) {
            $.each(owner.details(), function (i, r) {
                if (r.BrandId() === brandId && r.CardCode() === oldCardCode) {
                    r.CardCode(cardCode);
                }
            });
            piece.isBatchCardCode(false);
        }
        $('#pieceEditDetail').modal('hide');
    };
    piece.isBatchCardCode = ko.observable(false);
    ko.SlimCheckExtension.call(piece, piece.storages, {
        //rowkeyCallback: function (r) {
        //    return r.WFWarehouseStorageId;
        //}
    });
    piece.reset = function () {
        owner.details.removeAll();
        piece.storages.removeAll();
    };
};

/**
 * EntryTab:交易所仓单收货
 */
var ReceiptViewModel = function (route, owner, root) {
    var receipt = this;
    var base = GMK.Features.FeatureBase;
    receipt.detailsSummary = ko.computed(function () {
        var summary = { Weight: 0, ActualWeight: 0 };
        var p = owner.weightPrecision();
        $.each(owner.details(), function (i, r) {
            summary.Weight = utils.roundWeight(summary.Weight + utils.roundWeight(r.Weight(), p), p);
        });
        return summary;
    });
    receipt.editingDetail = null;
    receipt.updatingDetail = ko.mapping.fromJS(route.values.newDetail);
    receipt.toquery = {
        BrandId: ko.observable(),
        SpecificationId: ko.observable(),
        DateRange: ko.observable(),
        CardCode: ko.observable()
    };
    receipt.storages = ko.observableArray();
    receipt.onSearch = function () {
        var param = $.extend(ko.toJS(receipt.toquery), {
            CommodityId: root.item.CommodityId(),
            WarehouseId: root.item.WarehouseId(),
            ExchangeId: root.item.ExchangeId(),
            IsSpot: false,
            IsEntried: false,
            IsSaleOut: false,
            IsPledge: false,
            AccountingEntityId: root.item.AccountingEntityId(),
        });
        base._get('Warehouse/ListReceiptsForWarehouseEntry', param, function (result) {
            var detailsStorageIds = [];
            $.each(owner.details(), function (i, d) {
                detailsStorageIds = detailsStorageIds.concat($.map(d.WFWarehouseStorages(), function (s) {
                    return s.WFWarehouseStorageId;
                }));
            });
            var storages = $.grep(result, function (r) {
                return $.inArray(r.WFWarehouseStorageId, detailsStorageIds) === -1;
            }).slice();
            $.each(storages, function (i, r) {
                r.isSelected = ko.observable(false);
            });
            receipt.storages(storages);
        });
    };
    receipt.selectedStorages = ko.computed(function () {
        var list = $.grep(receipt.storages(), function (r) {
            return r.isSelected();
        });
        var summary = { Weight: 0 };
        var p = owner.weightPrecision();
        $.each(list, function (i, r) {
            summary.Weight = utils.roundWeight(summary.Weight + utils.roundWeight(r.Weight, p), p);
        });
        return { list: list, summary: summary };
    });
    receipt.toAddDetails = function () {
        receipt.storages.removeAll();
    };
    receipt.onAddDetails = function () {
        var storages = receipt.selectedStorages().list;
        var details = $.map(storages, function (r) {
            var detail = ko.mapping.fromJS(route.values.newDetail);
            detail.CommodityId(root.item.CommodityId());
            detail.UnitId(root.item.UnitId());
            detail.BrandId(r.BrandId);
            detail.SpecificationId(r.SpecificationId);
            detail.Weight(r.Weight);
            detail.CardCode(r.StorageCode);
            detail.Note(r.Note);
            detail.WFWarehouseStorages.push(r);
            var contractDetail = $.extend({}, route.values.newContractDetail);
            for (var p in contractDetail) if (p in detail) contractDetail[p] = detail[p];
            detail.WFContractEntryRecordDetails.push(ko.mapping.fromJS(contractDetail));
            return detail;
        });
        owner.details(owner.details().concat(details));
        receipt.storages.removeAll(storages);
    };
    receipt.onRemoveDetail = function (detail) {
        owner.details.remove(detail);
    };
    receipt.toEditDetail = function (detail) {
        receipt.editingDetail = detail;
        var plain = ko.mapping.toJS(detail);
        ko.mapping.fromJS(plain, receipt.updatingDetail);
    };
    receipt.onEditDetail = function () {
        var plain = ko.mapping.toJS(receipt.updatingDetail);

        ko.mapping.fromJS(plain, receipt.editingDetail);
        receipt.editingDetail = null;
        $('#receiptEditDetail').modal('hide');
    };
    ko.SlimCheckExtension.call(receipt, receipt.storages, {
        //rowkeyCallback: function (r) {
        //    return r.WFWarehouseStorageId;
        //}
    });
    receipt.reset = function () {
        owner.details.removeAll();
        receipt.storages.removeAll();
    };
};

/**
 * EntryTab:货物转移收货
 */
var StorageConvertViewModel = function (route, owner, root) {
    var sConvert = this;
    sConvert.detailsSummary = ko.computed(function () {
        var summary = { Weight: 0, ActualWeight: 0 };
        var p = owner.weightPrecision();
        $.each(owner.details(), function (i, r) {
            summary.Weight = utils.roundWeight(summary.Weight + utils.roundWeight(r.Weight(), p), p);
            summary.ActualWeight = utils.roundWeight(summary.ActualWeight + utils.roundWeight(r.ActualWeight(), p), p);
        });
        return summary;
    });
    sConvert.details = ko.observableArray(owner.details());
    sConvert.newDetail = ko.mapping.fromJS(route.values.newDetail);
    //sConvert.newDetail.Weight.subscribe(function (newVal) {
    //    if (newVal && !isNaN(newVal))
    //        sConvert.newDetail.ActualWeight(newVal);
    //});
    sConvert.editingDetail = null;
    sConvert.updatingDetail = ko.mapping.fromJS(route.values.newDetail);
    sConvert.toEditDetail = function (d) {
        sConvert.editingDetail = d;
        var plain = ko.mapping.toJS(d);
        ko.mapping.fromJS(plain, sConvert.updatingDetail);
    };
    sConvert.onEditDetail = function () {
        var plain = ko.mapping.toJS(sConvert.updatingDetail);
        $.each(plain.WFContractEntryRecordDetails || [], function (j, detail) {
            for (var p in detail) if (p in plain) detail[p] = plain[p];
        });
        ko.mapping.fromJS(plain, sConvert.editingDetail);
        sConvert.editingDetail = null;
        $('#storageConvertEditDetail').modal('hide');
    };
    sConvert.reset = function () {
        owner.details.removeAll();
    };
};

/**
 * Base:tab的基类
 */
var TabBaseViewModel = _class(function () {
    this.name = '';

    this.init = function (commonModels, route, options, owner) {
        this.weightPrecision = ko.computed(function () {
            return commonModels.findWeightPrecision(owner.item.CommodityId());
        });
        var _methods = {
            onComplete: function () {
                throw 'not implemented';
            }
        };
        $.extend(this, _methods);
    };
});

/**
 * 第一步基本信息，继承自TabBaseViewModel
 */
var TabFirstViewModel = _class(function () {
    this.upper().constructor.apply(this, arguments);

    var self = this;
    var base = GMK.Features.FeatureBase;
    self.name = '基本信息';
    self.transfer = ko.observable();
    self.contracts = ko.observableArray();
    self.storageConvert = ko.observable();
    self.isFinished = ko.observable(false);

    self.contractDetails = ko.computed(function () {
        return $.map(self.contracts(), function (r) {
            return r.WFContractDetailInfoes();
        });
    });
    self.init = function (commonModels, route, options, owner) {
        this.upper().init(commonModels, route, options, owner);
        self.selectTransfer = new SelectedTransferViewModel(commonModels, route, owner);
        self.selectContract = new SelectedContractViewModel(commonModels, route, owner);
        self.selectStorageConvert = new SelectedStorageConvertViewModel(commonModels, route, owner);
        self.ReceiveTypeWrapper = ko.computed({
            read: function () {
                return $.trim(owner.item.ReceiveType());
            },
            write: function (newVal) {
                var val = parseInt(newVal);
                if (val !== owner.item.ReceiveType()) {
                    owner.item.ReceiveType(val);
                }
            }
        });
        self.CommodityIdWrapper = ko.computed({
            read: function () {
                return owner.item.CommodityId();
            }, write: function (newVal) {
                var val = parseInt(newVal);
                if (val !== owner.item.CommodityId()) {
                    owner.item.CommodityId(val);
                }
            }
        });
        self.isIncomplete = ko.computed(function () {
            return owner.item.ReceiveType() === commonModels.Enums.SpotReceiveType.ForContract && self.contracts().length === 0 ||
                owner.item.ReceiveType() === commonModels.Enums.SpotReceiveType.TransferWarehouse && !self.transfer()
            || owner.item.ReceiveType() === commonModels.Enums.SpotReceiveType.StorageConvert && !self.storageConvert();
        });

        var _methods = {
            doValidate: function (callback) {
                return utils.doValidate('#firstForm', callback, null, null, owner.setCustomShowErrors.main, owner.setCustomShowErrors.noop);
            },
            onToggleContractShowDetail: function (r) {
                r.isShowDetail(!r.isShowDetail());
            },
            onComplete: function (callback) {
                var contracts = self.selectContract.selectedItems();
                var hasPledge = $.grep(contracts, function (r) {
                    return r.ContractType() == commonModels.Enums.ContractType.PledgeContract;
                });
                if (hasPledge.length > 0 && route.values.isCreate) { //当前为赎回合同，初始化赎回合同详情信息
                    owner.tabs.entry.pledgeContract.init(hasPledge[0].WFContractInfoId());
                }

                var firstDetail = contracts[0] && contracts[0].WFContractDetailInfoes()[0];
                if (firstDetail) {
                    var brandId = firstDetail.BrandId(),
                        specificationId = firstDetail.SpecificationId();
                    if (brandId) {
                        owner.tabs.entry.spot.newDetail.BrandId(brandId);
                        owner.tabs.entry.piece.toquery.BrandId(brandId);
                        owner.tabs.entry.receipt.toquery.BrandId(brandId);
                    }
                    if (specificationId) {
                        owner.tabs.entry.spot.newDetail.SpecificationId(specificationId);
                        owner.tabs.entry.piece.toquery.SpecificationId(specificationId);
                        owner.tabs.entry.receipt.toquery.SpecificationId(specificationId);
                    }
                }
                //if (route.values.isCreate && owner.item.ReceiveType() === commonModels.Enums.SpotReceiveType.TransferWarehouse) {
                //    self.generateByTransfer();
                //}
                self.isFinished(true);
                if (callback) {
                    callback();
                }
            },
        };
        $.extend(this, _methods);
    };
});
TabFirstViewModel.inherit(TabBaseViewModel);

/**
 * 第二步详情信息，继承自TabBaseViewModel
 */
var TabEntryViewModel = _class(function () {
    this.upper().constructor.apply(this, arguments);
    var self = this;
    var _previousChecked = null;
    var _currentCardCodeObserver;
    var _cache = {};
    var base = GMK.Features.FeatureBase;
    self.name = '详细信息';
    self.details = ko.observableArray();
    self.cardCodeList = ko.observableArray();
    self.isAutoGenerationRequired = ko.observable(false);
    self.isTrackDetailsContractDetailId = ko.observable(true);
    self.cardCodeQuery = {
        dateRange: ko.observable(),
        isUsed: ko.observable(),
        note: ko.observable()
    };

    self.init = function (commonModels, route, options, owner) {
        this.upper().init(commonModels, route, options, owner);
        self.spot = new SpotViewModel(route, self, owner);
        self.piece = new PieceViewModel(route, self, owner);
        self.receipt = new ReceiptViewModel(route, self, owner);
        self.storageConvert = new StorageConvertViewModel(route, self, owner);

        self.pledgeContract = new PledgeContractEntryRecord(commonModels, route, owner);

        self.isIncomplete = ko.computed(function () {
            if (owner.isPledgeContract && owner.isPledgeContract()) {
                return !self.pledgeContract.onInComputed();
            } else
                return !self.details().length;
        });
        self.UnitId = ko.computed(function () {
            var val = commonModels.findUnitId(owner.item.CommodityId());
            if (val !== owner.item.UnitId()) {
                owner.item.UnitId(val);
            }
            return val;
        });
        self.isAutoGenerationShow = ko.computed(function () {
            var isSpot = owner.isSpot(),
                isNotDeliveryBillMove = (owner.item.EntryType() != commonModels.Enums.WarehouseEntryType.DelivreyBillMove),
                isRequired = self.isAutoGenerationRequired();
            return isSpot && isNotDeliveryBillMove && isRequired;
        });

        self.allWarehouses = ko.computed(function () {
            if (owner.item.ReceiveType() == commonModels.Enums.SpotReceiveType.TransferWarehouse) {
                return $.grep(commonModels.AllWarehouses, function (r) {
                    return r.id != owner.item.TransferWarehouseId();
                });
            }else
                return commonModels.AllWarehouses;
        });

        self.isAutoGenerationShow.subscribe(function (newVal) {
            $('.card-code-for-spot').each(function () {
                $(this)[newVal ? 'removeClass' : 'addClass']('card-code-full-width');
            });
        });
        var _methods = {
            doValidate: function (callback) {
                if (owner.isPledgeContract()) {
                    return self.pledgeContract.doValidate() && utils.doValidate('#entryForm', callback, null, null, owner.setCustomShowErrors.main, owner.setCustomShowErrors.noop);
                } else
                    return utils.doValidate('#entryForm', callback, null, null, owner.setCustomShowErrors.main, owner.setCustomShowErrors.noop);
            },
            onSearchCardCode: function () {
                var splittings = (self.cardCodeQuery.dateRange() || '').split(' - ');
                base._get(options.listCardCodeUrl, {
                    warehouseId: owner.item.WarehouseId(),
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
                return true;
            },
            onSetCardCodeValue: function () {
                self.cardCodeQuery.isUsed(false);
                self.cardCodeQuery.dateRange('');
                _currentCardCodeObserver(_previousChecked ? _previousChecked.cardCode : null);
                return true;
            },
            onSetCardCode: function (observer, data) {
                self.onSearchCardCode();
                _currentCardCodeObserver = observer;
                return true;
            },
            onComplete: function (callback) {
                base._showSpinner(function () {
                    var details = self.details();
                    if (owner.isPledgeContract()) {
                        details = self.pledgeContract.toJS(owner.isSingleContractDetail());
                        self.details(details);
                    }
                    if (owner.item.ReceiveType() === commonModels.Enums.SpotReceiveType.ForContract && owner.isSingleContractDetail()) {
                        self.linkSingleContractDetail(details);
                    }
                    if (owner.item.ReceiveType() === commonModels.Enums.SpotReceiveType.TransferWarehouse) {
                        self.linkTransfer(details);
                        owner.item.WFWarehouseShiftingRecordIds(owner.tabs.first.transfer().WFWarehouseShiftingRecordIds || []);
                    }
                    if (owner.item.ReceiveType() === commonModels.Enums.SpotReceiveType.StorageConvert) {
                        self.linkStorageConvert(details);
                    }
                    base._hideSpinner(callback);
                });
            },
            linkDetail: function (detail, objectId, objectType) {
                self.isTrackDetailsContractDetailId(false);
                detail.ObjectId(objectId);
                detail.ObjectType(objectType);
                self.isTrackDetailsContractDetailId(true);
            },
            linkSingleContractDetail: function (details) {
                var contractDetail = owner.tabs.first.contracts()[0].WFContractDetailInfoes()[0];
                var contractDetailId = contractDetail.WFContractDetailInfoId();
                var objectType = commonModels.Enums.SendReceiveObjectType.ContractDetail;

                for (var i = 0; i < details.length ; i++) {
                    var oldDetail = ko.mapping.toJS(details[i]);
                    $.each(details[i].WFContractEntryRecordDetails(), function (j, r) {
                        var newDetail = ko.mapping.toJS(r);
                        //if (owner.isPledgeContract()) {
                            for (var p in newDetail) if (p in oldDetail) newDetail[p] = oldDetail[p];
                       // }
                        details[i].WFContractEntryRecordDetails()[j] = ko.mapping.fromJS(newDetail);
                    });
                    var linkDetail = $.grep(details[i].WFContractEntryRecordDetails(), function (r) {
                        if (r.ObjectType() != commonModels.Enums.SendReceiveObjectType.UnPledge) {
                            return r;
                        }
                    });
                    self.linkDetail(linkDetail[0], contractDetailId, objectType);
                }
            },
            linkTransfer: function (details) {
                var objectId = owner.tabs.first.transfer().WFWarehouseOutRecordId;
                var objectType = commonModels.Enums.SendReceiveObjectType.TransferWarehouse;

                for (var i = 0; i < details.length ; i++) {
                    var oldDetail = ko.mapping.toJS(details[i]);
                    $.each(details[i].WFContractEntryRecordDetails(), function (j, r) {
                        var newDetail = ko.mapping.toJS(r);
                        for (var p in newDetail) if (p in oldDetail) newDetail[p] = oldDetail[p];
                        details[i].WFContractEntryRecordDetails()[j] = ko.mapping.fromJS(newDetail);
                    });
                    //移仓收货对应的objectId和objectType 直接使用后台传过来的value
                  //  self.linkDetail(details[i].WFContractEntryRecordDetails()[0], objectId, objectType);
                }
            },
            linkStorageConvert: function (details) {
                var objectId = owner.tabs.first.storageConvert().WFStorageConversionId;
                var objectType = commonModels.Enums.SendReceiveObjectType.StorageConversion;

                for (var i = 0; i < details.length ; i++) {                                   
                    self.linkDetail(details[i].WFContractEntryRecordDetails()[0], objectId, objectType);
                }
            },
        };
        $.extend(this, _methods);
    };
});
TabEntryViewModel.inherit(TabBaseViewModel);

/**
 * 第三步合同关联信息，继承自TabBaseViewModel
 * TODO:合同关联列表中排除发货记录关联的那一条数据
 */
var TabLinkViewModel = _class(function () {
    var tab = this;
    tab.name = '关联合同';

    ko.SlimCheckExtension.call(tab, tab.flattenDetails, {
        rowkeyCallback: function (r) {
            return $.inArray(r, tab.flattenDetails());
        }
    });
    this.init = function (commonModels, route, options, owner) {
        this.upper().init(commonModels, route, options, owner);
        tab.newDetail = ko.mapping.fromJS(route.values.newDetail);
        tab.groups = ko.computed(function () {
            var data = $.map(owner.tabs.entry.details(), function (r) {
                var details = $.grep(r.WFContractEntryRecordDetails(),function (d) {
                    return d.ObjectType() != commonModels.Enums.SendReceiveObjectType.UnPledge;
                });
                r.WFContractEntryRecordDetails(details);
                return r;
            });
            return data;
        });
        tab.flattenDetails = ko.computed(function () {
            return $.map(tab.groups(), function (g) {
                return $.grep(g.WFContractEntryRecordDetails(), function (r) {
                    return r.ObjectType() != commonModels.Enums.SendReceiveObjectType.UnPledge;
                });
            });
        });
        tab.linkable = ko.computed(function () {
            var linkable = false;
            var details = owner.tabs.entry.details();
            for (var i = 0; i < details.length; i++) {
                for (var j = 0; j < details[i].WFContractEntryRecordDetails().length; j++) {
                    if (details[i].WFContractEntryRecordDetails()[j].isSelected()) {
                        linkable = true;
                        break;
                    }
                }
            }
            return linkable;
        });
        tab.isIncomplete = ko.computed({
            read: function () {
                var imcomplete = false;
                $.each(tab.groups(), function (i, r) {
                    $.each(r.WFContractEntryRecordDetails(), function (j, c) {
                        var contractDetailId = owner.tabs.entry.isTrackDetailsContractDetailId() ? c.ObjectId() : c.WFContractDetailInfoId.peek();
                        if (!tab.findDetailText(contractDetailId)) {
                            imcomplete = true;
                            return false;
                        }
                    });
                    //if (Math.abs(utils.parseFloat(r.Weight()) - r.WFContractEntryRecordDetails().sum(function (item) {
                    //    return utils.parseFloat(item.Weight());
                    //})) >= Math.Epsilon) {
                    //    imcomplete = true;
                    //    return false;
                    //}
                });
                return imcomplete;
            },
            deferEvaluation: true
        });
        tab.summaryByContractDetail = ko.computed({
            read: function () {
                //var p = owner.weightPrecision();
                var details = owner.tabs.entry.details();
                var contractInfos = owner.tabs.first.contractDetails();
                //循环contractInfo
                //在所有的entryDetails里面找到对应的contractInfo对应的entryDetail
                var contractDetails = $.map(contractInfos, function (info) {
                    var objectId = info.WFContractDetailInfoId();
                    var detail = {
                        detailText: info.detailText,
                        eds: function () {
                            return $.map(details, function (r) {
                                var ds = $.map(r.WFContractEntryRecordDetails(), function (d) {
                                    if (d.WFContractDetailInfoId() === objectId && d.ObjectType() != commonModels.Enums.SendReceiveObjectType.UnPledge) {
                                        d.BrandId(r.BrandId());
                                        d.SpecificationId(r.SpecificationId());
                                        d.CardCode(r.CardCode());
                                        return d;
                                    }
                                });
                                return ds || [];
                            });
                        }
                    };
                    detail.Weight = ko.computed(function () {
                        var weight = 0;
                        $.each(detail.eds() || [], function (i, r) {
                            weight = weight + r.Weight();
                        });
                        return weight;
                    });
                    detail.ActualWeight = ko.computed(function () {
                        var weight = 0;
                        $.each(detail.eds() || [], function (i, r) {
                            weight = weight + r.ActualWeight();
                        });

                        return weight;
                    });
                    return detail;
                });
                return contractDetails || [];
            },
            deferEvaluation: true
        });
        var _methods = {
            linkContractDetail: function (details, contractDetail) {
                contractDetail = contractDetail || {};
                var contractDetailId = ko.utils.unwrapObservable(contractDetail.WFContractDetailInfoId);
                $.each(details, function (i, d) {
                    owner.tabs.entry.linkDetail(d, contractDetailId, commonModels.Enums.SendReceiveObjectType.ContractDetail);
                });
            },
            linkContractDetailToSelectedDetails: function (isNull) {
                return function (contractDetail) {
                    var details = owner.tabs.entry.details();
                    var selectedDetails = [];
                    $.each(details, function (i, d) {
                        selectedDetails = selectedDetails.concat($.grep(d.WFContractEntryRecordDetails(), function (cd) {
                            return cd.isSelected();
                        }));
                    });
                    tab.linkContractDetail(selectedDetails, !isNull && contractDetail);
                    $.each(selectedDetails, function (i, r) {
                        r.isSelected(false);
                    });
                };
            },
            linkContractDetailToDetail: function (detail, isNull) {
                return function (contractDetail) {
                    tab.linkContractDetail([detail], !isNull && contractDetail);
                };
            },
            findDetailText: function (contractDetailId) {
                return (utils.find(owner.tabs.first.contractDetails(), function (r) {
                    return r.WFContractDetailInfoId() === contractDetailId;
                }) || {}).detailText;
            },
            computeWeight: function (g) {
                return (g.WFContractEntryRecordDetails() || []).sum(function (item) {
                    return item.ObjectType() == commonModels.Enums.SendReceiveObjectType.ContractDetail ? utils.parseFloat(item.Weight()) : 0;
                });
            },
            computeActualWeight: function (g) {
                return (g.WFContractEntryRecordDetails() || []).sum(function (item) {
                    return item.ObjectType() == commonModels.Enums.SendReceiveObjectType.ContractDetail ? utils.parseFloat(item.ActualWeight()) : 0;
                });
            },
            isValidGroup: function (g) {
                if (!g) return false;
                return Math.abs(utils.parseFloat(g.Weight()) - (g.WFContractEntryRecordDetails() || []).sum(function (item) {
                    return item.ObjectType() == commonModels.Enums.SendReceiveObjectType.ContractDetail ? utils.parseFloat(item.Weight()) : 0;
                })) < Math.Epsilon;
            },
            toManageGroup: function (g) {
                tab.editingGroup = g;
                ko.mapping.fromJS(ko.mapping.toJS(g), tab.newDetail);
            },
            finishManageGroup: function () {
                tab.editingGroup.WFContractEntryRecordDetails(tab.newDetail.WFContractEntryRecordDetails());
                $('#manageGroup').modal('hide');
            },
            onRemoveDetail: function (d) {
                if (tab.newDetail.WFContractEntryRecordDetails().length > 1) {
                    tab.newDetail.WFContractEntryRecordDetails.remove(d);
                }
            },
            onAddDetail: function () {
                var newDetail = ko.mapping.fromJS(route.values.newContractDetail);

                var basicDetail = ko.mapping.toJS(tab.editingGroup);
                newDetail.BrandId(basicDetail.BrandId);
                newDetail.CardCode(basicDetail.CardCode);
                newDetail.SpecificationId(basicDetail.SpecificationId);
                newDetail.WeightMemoCode(basicDetail.WeightMemoCode);

                tab.newDetail.WFContractEntryRecordDetails.push(newDetail);
            },
            onComplete: function (callback) {
                if (callback) {
                    callback();
                }
            },
            doValidate: function (callback) {
                return callback;
            }
        };
        $.extend(this, _methods);
    };
});
TabLinkViewModel.inherit(TabBaseViewModel);

/**
 * 收货main
 */
ns.EntryWizard = function (commonModels, route, options) {
    var self = this;
    var base = GMK.Features.FeatureBase;
    route.values.isCreateTransferWarehouse = route.values.isCreate && !route.values.isGeneralCreate
        && route.values.receiveType === commonModels.Enums.SpotReceiveType.TransferWarehouse;
    route.values.isCreateForContract = route.values.isCreate && !route.values.isGeneralCreate
        && route.values.receiveType === commonModels.Enums.SpotReceiveType.ForContract;
    route.values.isCreateForStorageConvert = route.values.isCreate && !route.values.isGeneralCreate
        && route.values.receiveType === commonModels.Enums.SpotReceiveType.StorageConvert;

    //用于保存 提交成功后的id信息
    var _entryRecordIdAfterSave = null;
    var _oldEntryRecordFromServer = null; //用于保存编辑时从服务器端获取的数据
    self.commonModels = commonModels;
    self.values = route.values;
    self.item = ko.mapping.fromJS(route.values.newItem);
    self.warningMessage = ko.observable('');
    self.isContinueSubmit = ko.observable(false);

    self.isStorageConvert = ko.computed(function () {
        return self.item.ReceiveType() == commonModels.Enums.SpotReceiveType.StorageConvert;
    });

    //货物转移收货类型：不可新增，编辑内容只能编辑卡号，结算重量，捆数，毛重
    self.isTransfer = ko.computed(function () {
        return self.item.ReceiveType() == commonModels.Enums.SpotReceiveType.TransferWarehouse;
    });

    //普通现货，仓库仓单，海运提单
    self.isSpot = ko.computed(function () {
        return self.item.WhStorageType() == commonModels.Enums.InventoryStorageType.Spot
        || self.item.WhStorageType() == commonModels.Enums.InventoryStorageType.WarehouseReceipt
        || self.item.WhStorageType() == commonModels.Enums.InventoryStorageType.BillOfLading;
    });

    self.inventoryTypes = ko.computed(function () {
        return $.grep(commonModels.EnumOptions.InventoryStorageType, function (r) {
            return r;
        });
    });
    self.byPieceCommodityIds = $.map($.grep(commonModels.AllCommodities, function (r) {
        return r.measureType === commonModels.Enums.CommodityMeasureType.ByPiece;
    }), function (r) {
        return r.id;
    });
    self.currStep = ko.observable();
    self.isByPiece = ko.computed(function () {
        return $.inArray(self.item.CommodityId(), self.byPieceCommodityIds) !== -1;
    });
    self.Commodity = ko.computed(function () {
        return utils.find(commonModels.AllCommodities, function (r) {
            return r.id === self.item.CommodityId();
        });
    });
    self.brands = ko.computed(function () {
        return (self.Commodity() || {}).brands || [];
    });
    self.specifications = ko.computed(function () {
        return (self.Commodity() || {}).specifications || [];
    });
    self.tabs = {
        first: new TabFirstViewModel(),
        entry: new TabEntryViewModel(),
        linkContract: new TabLinkViewModel()
    };
    for (var p in self.tabs)
        self.tabs[p].init(commonModels, route, options, self);

    self.steps = ko.computed(function () {
        var steps = [self.tabs.first];
        if (self.item.ReceiveType() === commonModels.Enums.SpotReceiveType.General) {
            steps = [self.tabs.first, self.tabs.entry];
        } else if (self.item.ReceiveType() === commonModels.Enums.SpotReceiveType.TransferWarehouse) {
            steps = [self.tabs.first, self.tabs.entry];
        } else if (self.item.ReceiveType() === commonModels.Enums.SpotReceiveType.ForContract) {
            if (self.isSingleContractDetail()) {
                steps = [self.tabs.first, self.tabs.entry];
            } else {
                steps = [self.tabs.first, self.tabs.entry, self.tabs.linkContract];
            }
        } else if (self.item.ReceiveType() === commonModels.Enums.SpotReceiveType.StorageConvert) {
            steps = [self.tabs.first, self.tabs.entry];
        }
        return steps;
    });
    self.currStepIndex = ko.computed(function () {
        return self.steps().indexOf(self.currStep());
    });
    self.prevStep = ko.computed(function () {
        return self.steps()[self.currStepIndex() - 1];
    });
    self.nextStep = ko.computed(function () {
        return self.steps()[self.currStepIndex() + 1];
    });

    self.isFromOuts = ko.computed(function () {
        return self.item.ReceiveType() == commonModels.Enums.SpotReceiveType.StorageConvert &&
            !self.tabs.first.selectStorageConvert.isAllowNew();
    });

    //赎回合同的收货：暂时不许新增，只允许选择已有的发货记录
    self.isPledgeContract = ko.computed(function () {
        return self.item.ReceiveType() == commonModels.Enums.SpotReceiveType.ForContract &&
            $.grep(self.tabs.first.selectContract.selectedItems(), function (r) { return r.ContractType() == commonModels.Enums.ContractType.PledgeContract }).length > 0;
    });

    self.isSingleContractDetail = ko.computed(function () {
        return self.tabs.first.contracts().length === 1 && self.tabs.first.contracts()[0].WFContractDetailInfoes().length === 1;
    });
    self.item.CommodityId.subscribe(function (newVal) {
        var commodity = utils.find(commonModels.AllCommodities, function (r) {
            return r.id === newVal;
        });
        self.item.UnitId((commodity || {}).unitId);
        if (route.values.isCreate) {
            self.item.StorageType((commodity || {}).storageType);
        }
        self.tabs.first.contracts([]);
        self.tabs.first.transfer(null);
        self.tabs.entry.spot.reset();
        self.tabs.entry.piece.reset();
        self.tabs.entry.receipt.reset();
        self.tabs.entry.storageConvert.reset();
    });
    self.item.WarehouseId.subscribe(function (newVal) {
        if (self.item.ReceiveType() !== commonModels.Enums.SpotReceiveType.TransferWarehouse) {
            self.tabs.entry.piece.reset();
            self.tabs.entry.receipt.reset();
            if (!route.values.isCreate) {
                self.tabs.entry.spot.reset();
            }
        }
    });
    self.item.ExchangeId.subscribe(function (newVal) {
        self.tabs.entry.receipt.reset();
    });
    self.item.WhStorageType.subscribe(function (newVal) {
        self.tabs.entry.spot.reset();
        self.tabs.entry.piece.reset();
        self.tabs.entry.receipt.reset();
    });
    self.item.ReceiveType.subscribe(function (newVal) {
        self.tabs.first.contracts([]);
        self.tabs.first.transfer(null);
    });
    var bundleUnit = $.grep(commonModels.AllUnits, function (r) {
        return r.code == "Bundle";
    });
    var _methods = {
        onPrev: function () {
            var step = self.prevStep();
            if (step) {
                self.currStep(step);
            }
        },
        onNext: function () {
            var step = self.nextStep();
            if (step && !self.currStep().isIncomplete()) {
                self.currStep().onComplete(function () {
                    self.currStep(step);
                });
            }
        },
        onValidateAndNext: function () {
            var f = self.currStep().doValidate(self.onNext);
            f();
        },
        load: function (callback) {
            base._get('Warehouse/GetWarehouseEntryRecord', { id: route.values.id }, function (result) {
                _oldEntryRecordFromServer = result.Data;
                ko.mapping.fromJS(result.Data, self.item);
                var details = $.map(self.item.WFWarehouseEntryRecordDetails(), function (r) {
                    // r.isSelected = false;
                    if (self.isByPiece()) {
                        r.CardCode(r.WFWarehouseStorages()[0] ? r.WFWarehouseStorages()[0].GroupCode() : r.CardCode());
                        r.WeightMemoCode(r.WFWarehouseStorages()[0] ? r.WFWarehouseStorages()[0].StorageCode() : r.CardCode());
                    }
                    $.each(r.WFContractEntryRecordDetails(), function (i, detail) {
                        detail.isSelected = ko.observable(false);
                    });
                    $.each((r.WFStorageAssistantMeasureInfoes() || []), function (i, info) {
                        if (info.SubMeasureType() == commonModels.Enums.SubMeasureType.Bundle) {
                            r.Bundles(info.Quantity());
                            r.BundlesMeasureInfoId(info.WFStorageAssistantMeasureInfoId());
                        }
                        if (info.SubMeasureType() == commonModels.Enums.SubMeasureType.GrossWeight) {
                            r.GrossWeight(info.Quantity());
                            r.GrossWeightMeasureInfoId(info.WFStorageAssistantMeasureInfoId());
                        }
                    });
                    return ko.mapping.fromJS(ko.mapping.toJS(r));
                });
                if (self.item.ReceiveType() === commonModels.Enums.SpotReceiveType.General) {
                    if (callback) {
                        callback();
                    }
                    self.tabs.entry.details(details);
                } else if (self.item.ReceiveType() === commonModels.Enums.SpotReceiveType.TransferWarehouse) {
                    var objectId = self.item.WFWarehouseEntryRecordDetails()[0].WFContractEntryRecordDetails()[0].ObjectId();
                    self.tabs.first.selectTransfer.select(objectId, function () {
                        if (callback) {
                            callback();
                        }
                        self.tabs.entry.details(details);
                    });
                } else if (self.item.ReceiveType() === commonModels.Enums.SpotReceiveType.ForContract) {
                    self.tabs.first.selectContract.toquery.CommodityId(self.item.CommodityId());
                    self.tabs.first.selectContract.toquery.CustomerId(self.item.CustomerId());
                    var contractDetails = [];
                    $.each(self.item.WFWarehouseEntryRecordDetails(), function (i, item) {
                        contractDetails = contractDetails.concat(item.WFContractEntryRecordDetails());
                    });
                    var ids = $.grep($.map(contractDetails, function (r) {
                        return r.WFContractDetailInfoId() || r.ObjectId() || 0;
                    }), function (r) {
                        return r > 0;
                    });
                    var contractDetailsIds = _.uniq(ids);
                    self.tabs.entry.details(details);
                    self.tabs.first.selectContract.loadFromRecord(contractDetailsIds, function () {
                        //根据合同后台返回的合同数据，初始化选择列表
                        if (self.isPledgeContract)
                            self.tabs.entry.pledgeContract.init(self.tabs.first.selectContract.selectedItems()[0].WFContractInfoId(), result.Data.WFWarehouseEntryRecordDetails, route.values.id);
                        if (callback) {
                            callback();
                        }
                    });
                } else if (self.item.ReceiveType() === commonModels.Enums.SpotReceiveType.StorageConvert) {
                    var objectId = self.item.WFWarehouseEntryRecordDetails()[0].WFContractEntryRecordDetails()[0].ObjectId();
                    self.tabs.first.selectStorageConvert.initByObjectId(objectId, false, function () {
                        if (callback) {
                            callback();
                        }
                        self.tabs.entry.details(details);
                        self.tabs.entry.storageConvert.details(details);
                    });
                }
            });
        },
        initialize: function (callback) {
            if (route.values.isCreate) {
                self.item.ReceiveBillTime(moment().startOf('day').toJSON());
                if (route.values.isGeneralCreate) {
                    self.item.ReceiveType(route.values.receiveType || commonModels.Enums.SpotReceiveType.ForContract);
                    self.currStep(self.steps()[0]);
                    callback();
                } else if (route.values.isCreateTransferWarehouse) {
                    self.item.ReceiveType(route.values.receiveType);
                    self.currStep(self.steps()[0]);
                    callback();
                    self.tabs.first.selectTransfer.select(route.values.objectId, function () {
                    });
                } else if (route.values.isCreateForContract) {
                    self.item.ReceiveType(route.values.receiveType);
                    self.currStep(self.steps()[0]);
                    callback();
                    self.tabs.first.selectContract.selectedSingleContract(route.values.objectId, function () {
                    });
                } else if (route.values.isCreateForStorageConvert) {
                    self.item.ReceiveType(route.values.receiveType);
                    self.currStep(self.steps()[0]);
                    callback();
                    self.tabs.first.selectStorageConvert.initByObjectId(route.values.objectId, true, function () {
                    });
                }
            } else {
                self.currStep(self.steps()[0]);
                self.load(function () { });
                if (callback)
                    callback();
            }
        },
        toJS: function () {
            var data = ko.mapping.toJS(self.item);
            data.WFWarehouseEntryRecordDetails = ko.mapping.toJS(self.tabs.entry.details);
            $.each(data.WFWarehouseEntryRecordDetails, function (i, detail) {
                //bundle辅助信息；排除infos全部为新建，id=0的情况                
                var bundleInfo = $.grep(detail.WFStorageAssistantMeasureInfoes || [], function (r) {
                    return r.WFStorageAssistantMeasureInfoId == detail.BundlesMeasureInfoId && detail.BundlesMeasureInfoId != 0;
                });
                //grossWeight辅助信息；排除infos全部为新建，id=0的情况
                var grossWerightInfo = $.grep(detail.WFStorageAssistantMeasureInfoes || [], function (r) {
                    return r.WFStorageAssistantMeasureInfoId == detail.GrossWeightMeasureInfoId && detail.GrossWeightMeasureInfoId != 0;
                });

                if (bundleInfo.length == 0 && grossWerightInfo.length == 0) {
                    detail.WFStorageAssistantMeasureInfoes = [];
                }

                if (detail.Bundles != null && detail.Bundles != '') {
                    if (bundleInfo.length > 0) {
                        $.each(detail.WFStorageAssistantMeasureInfoes, function (j, info) {
                            if (info.WFStorageAssistantMeasureInfoId == detail.BundlesMeasureInfoId)
                                info.Quantity = detail.Bundles;
                        });
                    } else {
                        detail.WFStorageAssistantMeasureInfoes = detail.WFStorageAssistantMeasureInfoes ? detail.WFStorageAssistantMeasureInfoes : [];
                        detail.WFStorageAssistantMeasureInfoes.push({
                            Quantity: detail.Bundles,
                            UnitId: bundleUnit.length > 0 ? bundleUnit[0].id : null,
                            SubMeasureType: commonModels.Enums.SubMeasureType.Bundle
                        });
                    }
                }
                if (detail.GrossWeight != null && detail.GrossWeight != '') {
                    if (grossWerightInfo.length > 0) {
                        $.each(detail.WFStorageAssistantMeasureInfoes, function (j, info) {
                            if (info.WFStorageAssistantMeasureInfoId == detail.GrossWeightMeasureInfoId)
                                info.Quantity = detail.GrossWeight;
                        });
                    } else {
                        detail.WFStorageAssistantMeasureInfoes = detail.WFStorageAssistantMeasureInfoes ? detail.WFStorageAssistantMeasureInfoes : [];
                        detail.WFStorageAssistantMeasureInfoes.push({
                            Quantity: detail.GrossWeight,
                            UnitId: data.UnitId,
                            SubMeasureType: commonModels.Enums.SubMeasureType.GrossWeight
                        });
                    }
                }

                //当为赎回合同收货时，需要将对应的发货信息保存WFContractEntryRecordDetails 里面
                if (self.isPledgeContract()) {
                    var needAddNew = true;
                    //为了解决在tabLinkContract中去掉了赎回详情对应的那一条记录的问题，临时解决方案
                    if (_oldEntryRecordFromServer) {
                        var oldDetail = $.grep(_oldEntryRecordFromServer.WFWarehouseEntryRecordDetails, function (r) {
                            return r.WFWarehouseEntryRecordDetailId == detail.WFWarehouseEntryRecordDetailId;
                        });
                        if (oldDetail.length > 0) {
                            $.each(oldDetail[0].WFContractEntryRecordDetails, function (i, r) {
                                if (r.ObjectType == commonModels.Enums.SendReceiveObjectType.UnPledge) {
                                    for (var p in r) if (p in detail) r[p] = detail[p];
                                    r.ObjectId = detail.RelatedOutRecordId;
                                    needAddNew = false;
                                    detail.WFContractEntryRecordDetails.push(r);
                                }
                            });
                        }
                    }                    
                    if (needAddNew) {
                        var contractDetail = $.extend({}, route.values.newContractDetail);
                        for (var p in contractDetail) if (p in detail) contractDetail[p] = detail[p];
                        contractDetail.ObjectId = detail.RelatedOutRecordId;
                        contractDetail.ObjectType = commonModels.Enums.SendReceiveObjectType.UnPledge;
                        detail.WFContractEntryRecordDetails.push(contractDetail);
                    }
                    detail.oldEntryRecord = null;
                    detail.RelatedOutRecord = null;
                }
            });
            return data;
        },
        severValidate: function (callback) {
            var param = self.toJS(), date;
            if (self.tabs.first.ReceiveTypeWrapper() == commonModels.Enums.SpotReceiveType.TransferWarehouse) {
                date = moment(new Date(self.tabs.first.transfer().OpenBillTime));
                if (param.ReceiveBillTime.valueOf() < date.toDate().valueOf()) {
                    alert('移库收单日期应该晚于移库开单日期' + date.format('YYYY-MM-DD'));
                    return;
                }
            }
            var weightIsMatched = true;
            $.each(param.WFWarehouseEntryRecordDetails, function (i, r) {
                var weight1 = 0, weight2 = 0;
                $.each(r.WFContractEntryRecordDetails, function (j, item) {
                    if (item.ObjectType != commonModels.Enums.SendReceiveObjectType.UnPledge) {
                        weight1 = weight1 + utils.parseFloat(item.Weight);
                        weight2 = weight2 + utils.parseFloat(item.ActualWeight);
                    }
                });
                weightIsMatched = weightIsMatched && ((Math.abs(weight1 - ko.utils.unwrapObservable(r.Weight)) < Math.Epsilon) && (Math.abs(weight2 - (ko.utils.unwrapObservable(r.ActualWeight) || 0)) < Math.Epsilon));
            });
            if (!weightIsMatched) {
                alert('请确保拆分后的重量信息和收货明细的重量信息匹配！');
                return;
            }

            var summary = param.ContractWeightSummary = {}, oldContractEntryRecordDetails = param.WFContractEntryRecordDetails || [], key;
            $.each(oldContractEntryRecordDetails, function (i, item) {
                key = "" + item.WFContractDetailInfoId;
                var weight = (item.ActualWeight == undefined || item.ActualWeight == 0) ? item.Weight : item.ActualWeight;
                if (summary[key] == undefined) summary[key] = utils.parseFloat(weight);
                else summary[key] = summary[key] + utils.parseFloat(weight);
            });
            base._post('Warehouse/ValidateEntryRecord', param, function (result) {
                if (callback) {
                    callback(result);
                }
            });
        },
        save: function (callback) {
            var param = self.toJS();
            if (self.item.ReceiveType() == commonModels.Enums.SpotReceiveType.TransferWarehouse) {
                param.CustomerId = window.corporationId;
            }
            //console.log('begin save, ' + moment().toJSON());
            base._post('Warehouse/SaveEntryRecord', param, function (result) {
                //console.log('end save, ' + moment().toJSON());
                if (callback) {
                    callback(result);
                }
            });
        },
        onSetEntryRecordStatus: function () {
            // var param = self.toJS();
            base._post('Warehouse/SetEntryRecordStatusById', { id: _entryRecordIdAfterSave }, function (result) {
                if (result.Status === true) {
                    //alert('操作成功');
                    self.leave();
                } else {
                    alert(result.Message);
                }
            });
        },
        onSave: function () {
            self.save(function (result) {
                _entryRecordIdAfterSave = result.ExtraData;
                if (result.Message) {
                    self.warningMessage(result.Message || '');
                    $('#confirmFinishEntryModal').modal('show');
                } else {
                    self.leave();
                }
            });
        },
        onSeverValidateAndSave: function () {
            self.severValidate(function (severValidateResult) {
                if (severValidateResult.Message) {
                    self.warningMessage(severValidateResult.Message || '');
                    $('#confirmSaveModal').modal('show');
                } else {
                    self.onSave();
                }
            });
        },
        onValidateAndSeverValidateAndSave: function () {
            self.warningMessage('');
            self.currStep().onComplete(function () {
                var f = self.currStep().doValidate(self.onSeverValidateAndSave);
                f();
            });
        },
        leave: function () {
            History.back();
        }
    };
    $.extend(this, _methods);

    self.invalids = { main: ko.observable() };
    self.customShowErrors = ko.observable();
    utils.setCustomShowErrors(self.customShowErrors);
    self.setCustomShowErrors = {
        main: function () { self.customShowErrors(self.invalids.main); },
        noop: function () { self.customShowErrors($.noop); }
    };
};

/*
 * 赎回合同的收货处理模块
*/
var PledgeContractEntryRecord = function (commonModels, route, root) {
    var self = this;
    var base = GMK.Features.FeatureBase;

    this.outRecords = ko.observableArray([]);
    this.allOutRecords = ko.observableArray([]);
    this.oldEntryDetails = ko.observableArray([]);
    this.warehouseIds = ko.observableArray([]);

    this.summary = {
        count: ko.observable(),
        weight: ko.observable(),
        actualWeight: ko.observable(),
    };

    this.avilableWarehouses = ko.computed(function () {
        return $.grep(commonModels._AllWarehouses, function (r) {
            return $.inArray(r.id, self.warehouseIds()) != -1;
        });
    });

    this.canUserInput = ko.computed(function () {//提单，仓库仓单不可填写，现货可填写
        return root.item.WhStorageType() == commonModels.Enums.InventoryStorageType.Spot;
    });
    this.summaryAutoComputed = ko.computed(function () {
        var selected = $.map(self.outRecords(), function (r) {
            if (r.checked())
                return r.details;
        });
        var count = 0, weight = 0, actualWeight = 0;
        $.each(selected, function (i, r) {
            count++;
            weight += utils.parseFloat(r.entryRecord.Weight());
            actualWeight += utils.parseFloat(r.entryRecord.ActualWeight());
        });
        self.summary.count(count);
        self.summary.weight(weight);
        self.summary.actualWeight(actualWeight);
    });

    this.storageCodeDisable = ko.computed(function () {
        return root.item.WhStorageType() == commonModels.Enums.InventoryStorageType.WarehouseReceipt || root.item.WhStorageType() == commonModels.Enums.InventoryStorageType.BillOfLading;
    });
    this.checkBoxDisable = ko.computed(function () {
        if (self.storageCodeDisable())
            return $.grep(self.outRecords(), function (r) {
                return r.checked();
            }).length == 1;
        return false;
    });

    var _methods = {
        init: function (contractId, oldEntryDetails, entryRecordId) {
            //初始化仓库选择框以及仓库选择时的变化
            root.item.WarehouseId.subscribe(function (newVal) {
                if (newVal) {
                    var avilableOuts = $.grep(self.allOutRecords(), function (r) { return r.warehouseId[0] == root.item.WarehouseId() });
                    self.outRecords(avilableOuts);
                }
            });
            if (oldEntryDetails && oldEntryDetails.length > 0)
                self.oldEntryDetails(oldEntryDetails);
            self.getDataFromOuts(contractId, root.item.WhStorageType(), entryRecordId);
        },
        toJS: function () {
            var list = $.map(self.outRecords(), function (r) {
                if (r.checked())
                    return r.details;
            });
            var data = $.map(list, function (r) {
                if (!r.entryRecord.WFContractEntryRecordDetails() || !r.entryRecord.WFContractEntryRecordDetails().length) {
                    var contractDetail = $.extend({}, route.values.newContractDetail);
                    var detail = ko.mapping.toJS(r.entryRecord);
                    for (var p in contractDetail) if (p in detail) contractDetail[p] = detail[p];
                    detail.ObjectType = commonModels.Enums.SendReceiveObjectType.ContractDetail; //默认添加类型
                    r.entryRecord.WFContractEntryRecordDetails.push(ko.mapping.fromJS(contractDetail));
                }
                return r.entryRecord;
            });
            return data;
        },
        onInComputed: function () {
            var data = $.grep(self.outRecords(), function (r) {
                return r.checked();
            });
            return !self.storageCodeDisable() ? data.length > 0 : data.length == 1;
        },
        getDataFromOuts: function (contractId, type, entryRecordId) {
            base._get('Warehouse/GetOutRecordForPledgeContract', { id: contractId, type: type, entryRecordId: entryRecordId }, function (result) {
                var warehouseIds = [];
                self.allOutRecords([]);
                self.outRecords([]);
                var data = $.map(result.Data.list, function (r) {
                    r.Bundles = null; r.GrossWeight = null;
                    r.entryRecord = ko.mapping.fromJS(route.values.newDetail);
                    r.entryRecord.CardCode(r.WFWarehouseStorage.StorageCode);
                    r.entryRecord.PtStorageGroupCode(r.WFWarehouseStorage.GroupCode);
                    r.entryRecord.BrandId(r.BrandId);
                    r.entryRecord.SpecificationId(r.SpecificationId);
                    r.entryRecord.RelatedOutRecordId(r.WFWarehouseOutRecordDetailId);
                    r.entryRecord.RelatedOutRecord(r);

                    $.each((r.WFOutRecordAssistantMeasureInfoes || []), function (i, info) {
                        if (info.SubMeasureType == commonModels.Enums.SubMeasureType.Bundle) {
                            //  r.entryRecord.Bundles(info.Quantity);
                            r.Bundles = info.Quantity;
                        }
                        if (info.SubMeasureType == commonModels.Enums.SubMeasureType.GrossWeight) {
                            //  r.entryRecord.GrossWeight(info.Quantity);
                            r.GrossWeight = info.Quantity;
                        }
                    });
                    r.selected = ko.observable(false);
                    r.isRedeemed = ko.observable(false);
                    warehouseIds.push(r.WFWarehouseStorage.WarehouseId);
                    if (!route.values.isCreate)
                        self.initDetailsForEdit(r);
                    r.selected.subscribe(function (newVal) {
                        if (newVal == true) {
                            r.entryRecord.Weight(r.isRedeemed() ? (r.AvailableImpawnWeight + r.oldEntryRecord.Weight) : r.AvailableImpawnWeight);
                            r.entryRecord.ActualWeight(r.isRedeemed() ? (r.AvailableImpawnWeight + r.oldEntryRecord.Weight) : r.AvailableImpawnWeight);
                            r.entryRecord.Bundles(r.Bundles);
                            r.entryRecord.GrossWeight(r.isRedeemed() ? (r.AvailableImpawnWeight + r.oldEntryRecord.Weight) : r.AvailableImpawnWeight);
                        } else {
                            r.entryRecord.Weight(null);
                            r.entryRecord.ActualWeight(null);
                            r.entryRecord.Bundles(null);
                            r.entryRecord.GrossWeight(null);
                        }
                    });

                    r.notRedeemeWeight = ko.computed(function () {
                        var totalNeedRedeemWeight = r.isRedeemed() ? (r.AvailableImpawnWeight + r.oldEntryRecord.Weight) : r.AvailableImpawnWeight;
                        return utils.roundWeight(totalNeedRedeemWeight - r.entryRecord.Weight());
                    });
                    //已赎回总重量
                    r.isRedeemedWeight = ko.computed(function () {
                        return utils.roundWeight((r.ActualWeight || r.Weight) - r.notRedeemeWeight());
                    });
                    return r;
                });
                var list = self.initDetailsByGroup(data);
                self.allOutRecords(list);
                self.warehouseIds(warehouseIds.getUnique());
                var avilableOuts = $.grep(list, function (r) { return r.warehouseId[0] == root.item.WarehouseId() });
                self.outRecords(avilableOuts);
            });
        },
        initDetailsForEdit: function (r) {
            var hasEntry = $.each(self.oldEntryDetails(), function (j, entry) {
                $.each(entry.WFContractEntryRecordDetails, function (k, detail) {
                    detail.isSelected = ko.observable(false);
                    if (detail.ObjectType == commonModels.Enums.SendReceiveObjectType.UnPledge) {
                        entry.RelatedOutRecordId = detail.ObjectId;
                        return;
                    }
                });
                $.each((entry.WFStorageAssistantMeasureInfoes || []), function (i, info) {
                    if (info.SubMeasureType == commonModels.Enums.SubMeasureType.Bundle) {
                        entry.Bundles = info.Quantity;
                        entry.BundlesMeasureInfoId = info.WFStorageAssistantMeasureInfoId;
                    }
                    if (info.SubMeasureType == commonModels.Enums.SubMeasureType.GrossWeight) {
                        entry.GrossWeight = info.Quantity;
                        entry.GrossWeightMeasureInfoId = info.WFStorageAssistantMeasureInfoId;
                    }
                });
                if (entry.RelatedOutRecordId == r.WFWarehouseOutRecordDetailId) {
                    r.isRedeemed(true);
                    r.selected(true);
                    ko.mapping.fromJS(entry, r.entryRecord);
                    // r.entryRecord.WFContractEntryRecordDetails();
                    if (entry.WFWarehouseStorages[0]) {
                        r.entryRecord.PtStorageGroupCode(entry.WFWarehouseStorages[0].GroupCode);
                    }
                    r.oldEntryRecord = entry;
                    return;
                }
            });
        },
        initDetailsByGroup: function (data) { //如果是船运提单或者仓库仓单，根据组号做group map
            var groups = $.map(data, function (r) {
                return r.entryRecord.PtStorageGroupCode();
            });
            groups = groups.getUnique();
            var list = [];
            if (self.storageCodeDisable()) {
                list = $.map(groups, function (r) {
                    return {
                        groupCode: ko.observable(r),
                        details: $.grep(data, function (detail) {
                            return detail.entryRecord.PtStorageGroupCode() == r;
                        }),
                        checked: ko.observable(false),
                        warehouseId: $.map(data, function (detail) {
                            if (detail.entryRecord.PtStorageGroupCode() == r)
                                return detail.WFWarehouseStorage.WarehouseId;
                        }).getUnique(),
                    };
                });
            } else {
                list = $.map(data, function (r) { //如果是普通现货默认一个groupCode带一条信息
                    return {
                        groupCode: ko.observable(r.entryRecord.PtStorageGroupCode()),
                        details: [r],
                        checked: ko.observable(false),
                        warehouseId: [r.WFWarehouseStorage.WarehouseId],
                    };
                });
            }
            list = $.map(list, function (r) {
                var checked = $.grep(r.details, function (d) {
                    return d.isRedeemed();
                })
                r.checked(checked.length > 0);

                r.checked.subscribe(function (newVal) {
                    if (newVal == true) {
                        root.item.DeliveryOrderCode(r.groupCode());
                    } else {
                        root.item.DeliveryOrderCode(null);
                    }
                    $.each(r.details, function (j, e) {
                        r.details[j].selected(newVal);
                    });
                });
                if (self.storageCodeDisable()) {
                    r.groupCode.subscribe(function (newVal) {
                        root.item.DeliveryOrderCode(newVal);
                        $.each(r.details, function (j, e) {
                            r.details[j].entryRecord.PtStorageGroupCode(newVal);
                        });
                    });
                }
                return r;
            });
            return list;
        },
        doValidate: function () {
            var validate = true;
            var list = $.map(self.outRecords(), function (r) {
                if (r.checked())
                    return r.details;
            });
            $.each(list, function (i, r) {
                if (r.notRedeemeWeight() < 0) {
                    alert('当前赎回重量不能超过总质押重量！');
                    validate = false;
                    return validate;
                }
            });
            return validate;
        },
    };
    $.extend(this, _methods);
}
