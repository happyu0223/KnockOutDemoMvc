var GMK = GMK || {};
GMK.Storage = GMK.Storage || {};
GMK.Storage.ImpawnSpotRecords = GMK.Storage.ImpawnSpotRecords || {};

GMK.Storage.ImpawnSpotRecords.start = function () {
    GMK.Features.CommonModels.onReady(function (models) {
        var $router = $('#gmk-route'), action = $router.data('action');
        if (action == "List") {
            var viewModel = new GMK.Storage.ImpawnSpotRecords.IndexViewModel(models, {
                getImpawnSpotUrl: 'Storage/GetImpawnSpotTrackers',
                searchUrl: 'Storage/ListImpawnSpotRecords',
                deleteUrl: 'Storage/DeleteImpawnRecord',
                cancelFinishUrl: 'Storage/CancelFinishImpawnSpot',
                finishUrl: 'Storage/FinishImpawnSpot'
            });
            ko.applyBindings(viewModel);
            models.registerQueryFormEvent();
            function initialize(query) {
                viewModel.query.customerId(query.CustomerId || query.customerId);
                viewModel.query.commodityId(query.CommodityId || query.commodityId || models.UserCommodities[0].id);
                viewModel.query.dateRange(query.DateRange || query.dateRange);
                ko.utils.InlineEditorInitialize(viewModel.onInlineEditorSave);
                viewModel.onInitialize();
            }
            initialize(models.getQuery());
            models.registerStateChange(initialize);
        } else if (action == "Manage") {
            var viewModel = new GMK.Storage.ImpawnSpotRecords.ManageViewModel(models, {
                getImpawnSpotUrl: 'Storage/GetImpawnSpotRecord',
                listContractsUrl: 'Storage/ListContract',
                generateDiliveryCodeUrl: 'Warehouse/GenerateDeliveryOrderCode',
                listSpotsUrl: 'Warehouse/ListSpots',
                saveUrl: 'Storage/SaveImpawnRecord',
                saveAndGenerateDeliveryCodeUrl: 'Storage/SaveImpawnRecordAndGenerateDeliveryCode'
            }, {
                key: $router.data('key')
            });
            window.vm = viewModel;
            ko.applyBindings(viewModel);
            viewModel.onInitialize();
        }
    });
};

GMK.Storage.ImpawnSpotRecords.IndexViewModel = function (models, actions) {
    var self = this, base = GMK.Features.FeatureBase, mappingQueryOpts;
    self.commonModels = models;
    self.query = constructQuery();
    mappingQueryOpts = {
        include: Object.getOwnPropertyNames(self.query)
    };
    self.list = ko.observableArray();

    self.currentWeights = ko.observable();
    self.currentActualWeights = ko.observable();
    self.currentLeftPledgedWeights = ko.observable();
    self.list.subscribe(function () {
        var w1 = w2 = w3 = 0;
        $.each(self.list(), function (i, item) {
            w1 += utils.parseFloat(item.TotalWeight);
            w2 += utils.parseFloat(item.ActualWeight);
            w3 += utils.parseFloat(item.LeftPledgedWeight);
        });
        self.currentWeights(w1);
        self.currentActualWeights(w2);
        self.currentLeftPledgedWeights(w3);
    });
    self.totalCount = ko.observable();
    self.totalWeights = ko.observable();
    self.totalActualWeights = ko.observable();
    self.totalLeftPledgedWeights = ko.observable();

    var expandingItem, $divQueryResult = $('#tableQueryResult');
    function _initializeExpandable() {
        if ($divQueryResult.expandable('instance')) $divQueryResult.expandable('destroy');
        $divQueryResult.expandable({
            toggleCallback: function (e) {
                expandingItem = e.target;
                self.onGetDetails(self.list()[parseInt(e.target.closest('tr').attr('id').substr('state_'.length), 10)]);
            }
        });
    }
    self.onSearch = function () {
        base._get(actions.searchUrl, ko.mapping.toJS(self.query, mappingQueryOpts), function (data) {
            fill(data);
        });
    };

    self.onGetDetails = function (item) {
        if (item.spotList().length > 0) return;
        base._get(actions.getImpawnSpotUrl, { id: item.WFPledgeInfoId }, function (data) {
            $.each(data, function (i, item) {
                item.ActualWeight = ko.observable(item.ActualWeight);
                item.LeftPledgedWeight = ko.observable(item.LeftPledgedWeight);
            });
            item.spotList(data);
            if (expandingItem) $divQueryResult.trigger('expanded.expandable', { target: expandingItem });
            expandingItem = null;
        });
    };

    self.onInlineEditorSave = function (url, viewModel, newVal, callback, source, allBindings) {
        base._post(url, { id: viewModel.WFWhStorageFlowTrackId, actualWeight: isNaN(newVal) ? -1 : utils.parseFloat(newVal) }, function () {
            var offsetA = utils.parseFloat(newVal) - utils.parseFloat(viewModel.ActualWeight()),
                offsetL = utils.parseFloat(newVal) - utils.parseFloat(viewModel.ActualWeight() || viewModel.Weight);
            viewModel.ActualWeight(utils.formatDecimal(newVal, self.commonModels.settings.weightDigits));
            var v = utils.parseFloat(viewModel.LeftPledgedWeight()) + offsetL;
            viewModel.LeftPledgedWeight(utils.formatDecimal(v, self.commonModels.settings.weightDigits));

            var tr = $(source).closest('table').closest('tr').prev('tr'), targetA = tr.find('td:nth-child(10)'), targetL = tr.find('td:nth-child(11)');
            v = utils.parseFloat(targetA.text()) + offsetA;
            targetA.text(utils.formatDecimal(v, self.commonModels.settings.weightDigits));
            v = utils.parseFloat(targetL.text()) + offsetL;
            targetL.text(utils.formatDecimal(v, self.commonModels.settings.weightDigits));
            callback();
        });
    }

    self.onDelete = function (item) {
        base._delete(actions.deleteUrl, { id: item.WFPledgeInfoId }, function (data) {
            self.list.remove(item);
            self.onSearch();
        });
    };

    self.onFinish = function (item) {
        base._post(actions.finishUrl, { id: item.WFPledgeInfoId }, function (data) {
            item.IsUnPledgeFinished(true);
            self.onSearch();
        });
    };

    self.onCancelFinish = function (item) {
        base._post(actions.cancelFinishUrl, { id: item.WFPledgeInfoId }, function (data) {
            item.IsUnPledgeFinished(false);
            self.onSearch();
        });
    };

    self.onInitialize = function () {
        self.onSearch();
    };

    self.findAccountingEntity = function (id) {
        return $.grep(self.commonModels.AccountingEntities, function (item) { return item.id == id })[0].name;
    };

    function fill(data) {
        $.each(data.Data.result, function (i, item) {
            item.isShow = ko.observable(false);
            item.IsUnPledgeFinished = ko.observable(item.IsUnPledgeFinished);
            item.measureType = ko.observable((function () {
                return ($.grep(self.commonModels.AllCommodities, function (elem) { return elem.id == item.CommodityId })[0] || {}).measureType;
            })());
            item.spotList = ko.observableArray([]);
        });
        self.list(data.Data.result);
        self.totalCount(data.Data.summary.TotalCount);
        self.totalWeights(data.Data.summary.TotalWeight);
        self.totalActualWeights(data.Data.summary.ActualWeight);
        self.totalLeftPledgedWeights(data.Data.summary.LeftPledgedWeight);
        _initializeExpandable();
        base._p(data.Data.pagination, actions.searchUrl, fill, function () {
            return ko.mapping.toJS(self.query, mappingQueryOpts);
        });
    }
    function constructQuery() {
        return {
            customerId: ko.observable(),
            commodityId: ko.observable(),
            dateRange: ko.observable(),
            isSpotPledge: true
        };
    }
};

GMK.Storage.ImpawnSpotRecords.ManageViewModel = function (models, actions, params) {
    var self = this, base = GMK.Features.FeatureBase, mappingViewModelOpts, mappingQueryOpts;
    self.commonModels = models;
    self.query = constructQuery();
    mappingQueryOpts = {
        include: Object.getOwnPropertyNames(self.query)
    };
    self.isCreate = ko.observable(!params.key);
    self.isAll = ko.observable();
    self.isAll.subscribe(function (newVal) {
        $.each(self.spotList(), function (i, item) {
            if (item.IsSelected() != newVal) item.IsSelected(newVal);
        });
    });
    self.spotList = ko.observableArray();
    self.currentSelectedSpotsLength = ko.observable(0);
    self.selectedSpots = ko.observableArray();
    self.totalWeightForSelectedSpots = ko.computed(function () {
        var w = 0;
        $.each(self.selectedSpots(), function (i, item) {
            $.each(item.ContractDetails, function (j, elem) {
                w += utils.parseFloat(elem.Weight());
            });
        });
        return w;
    });
    self.totalActualWeightForSelectedSpots = ko.computed(function () {
        var w = 0;
        $.each(self.selectedSpots(), function (i, item) {
            $.each(item.ContractDetails, function (j, elem) {
                w += utils.parseFloat(elem.ActualWeight());
            });
        });
        return w;
    });
    self.currentTotalWeightForSelectedSpots = ko.computed(function () {
        var w = 0;
        $.each(self.spotList(), function (i, item) {
            if (!item.IsSelected()) return true;
            $.each(item.ContractDetails, function (j, elem) {
                w += utils.parseFloat(elem.Weight());
            });
        });
        return w;
    });
    self.viewModel = constructViewModel();
    self.viewModel.customerId.subscribe(function (newVal) {
        if (!newVal) {
            self.viewModel.pledgeRate('');
            self.viewModel.pledgeInterestRate('');
            return;
        }
        var customer = $.grep(self.customers(), function (item) {
            return item.id == newVal;
        })[0];
        self.viewModel.pledgeRate(customer.pledgeRate);
        self.viewModel.pledgeInterestRate(customer.pledgeInterestRate);
    });
    mappingviewModelOpts = {
        include: Object.getOwnPropertyNames(self.viewModel)
    };
    self.measureType = ko.observable();

    self.customers = ko.observableArray(self.commonModels._AllCustomers);
    self.thirdpartyCustomers = ko.observableArray(self.commonModels._AllCustomers);
    self.contracts = ko.observableArray();
    self.commodityContracts = ko.computed(function () {
        return $.grep(self.contracts(), function (r) {
            return r.CommodityId === self.viewModel.commodityId();
        });
    });
    self.viewModel.commodityId.subscribe(function (newVal) {
        resetByCommodity(newVal);
    });
    self.brands = ko.observableArray();
    self.specifications = ko.observableArray();
    self.accountingEntities = ko.observableArray();
    resetByCommodity(self.viewModel.commodityId());

    ko.SlimCheckExtension.call(self, self.spotList, {
        isSelectedObservable: function (elem) {
            return elem.IsSelected;
        }
    });

    self.onInitialize = function () {
        setDefaults();
        self.loadContract(function () {
            if (!self.isCreate()) {
                setTimeout(function () {
                    base._get(actions.getImpawnSpotUrl, { id: params.key }, function (data1) {
                        var properties = Object.getOwnPropertyNames(data1.PledgeInfo);
                        var pledgeInfo = {}, isOdd;
                        for (var i = 0, len = properties.length; i < len; i++) {
                            pledgeInfo[toCamelCase(properties[i])] = data1.PledgeInfo[properties[i]];
                        }
                        var opts = $.extend({}, mappingviewModelOpts, { ignore: ['wFWhStorageFlowTracks'] });
                        ko.mapping.fromJS(pledgeInfo, opts, self.viewModel);
                        self.viewModel.pledgeInterestRate(pledgeInfo.pledgeInterestRate);
                        self.viewModel.pledgeRate(pledgeInfo.pledgeRate);
                        $.each(data1.Spots, function (i, item) {
                            item.IsSelected = new ko.observable(false);
                            item.IsSelected.subscribe(function (newVal) {
                                onSelectedChanged(newVal, item);
                            });
                            if (i == 0) isOdd = false;
                            else if (data1.Spots[i].WarehouseId != data1.Spots[i - 1].WarehouseId) isOdd = !isOdd;
                            item.isOdd = ko.observable(isOdd);
                            $.each(item.ContractDetails, function (j, elem) {
                                var track = $.grep(data1.PledgeInfo.WFWhStorageFlowTracks, function (v) { return v.SourceWarehouseStorageId == elem.WFWarehouseStorageId; })[0];
                                elem.Weight = ko.observable(track.Weight);
                                elem.ActualWeight = ko.observable(track.ActualWeight);
                            });
                            item.DeliveryOrderCode = ko.observable(item.DeliveryOrderCode);
                        });
                        self.selectedSpots(data1.Spots);
                    });
                }, 0);
            }
        });
    };
    self.loadContract = function (callback) {
        base._get(actions.listContractsUrl, { pledgeId: params.key }, function (result) {
            self.contracts(result.Data);
            callback();
        });
    };
    self.onSearch = function () {
        self.currentSelectedSpotsLength(0);
        self.spotList.removeAll();
        var param = ko.mapping.toJS(self.query, mappingQueryOpts);
        base._get(actions.listSpotsUrl, param, function (data) {
            // remove the spots which has been selected
            $.each(self.selectedSpots(), function (i, item) {
                for (var i = 0, len = data.length; i < len; i++) {
                    if (data[i].ContractDetails[0].WFWarehouseStorageId == item.ContractDetails[0].WFWarehouseStorageId) {
                        data.splice(i, 1);
                        break;
                    }
                }
            });
            $.each(data, function (i, item) {
                item.IsSelected = ko.observable(false);
                item.IsSelected.subscribe(function (newVal) {
                    onSelectedChanged(newVal, item);
                });
                $.each(item.ContractDetails, function (j, elem) {
                    elem.Weight = ko.observable(0);
                    elem.ActualWeight = ko.observable(elem.ActualWeight);
                });
                item.DeliveryOrderCode = ko.observable();
            });
            self.spotList(data);
        });
    };

    self.onGenerateDeliveryOrderCode = function () {
        base._post(actions.generateDiliveryCodeUrl, { commodityId: self.viewModel.commodityId }, function (data) {
            self.viewModel.deliveryOrderCode(data.Data);
        });
    };

    self.onDeleteSpot = function (item) {
        var index = self.selectedSpots.indexOf(item);
        self.selectedSpots.remove(item);
        if (self.measureType() == self.commonModels.Enums.CommodityMeasureType.ByPiece) {
            item.TotalAailableWeight = 0;
            $.each(item.ContractDetails, function (j, elem) {
                elem.AailableWeight = elem.Weight();
                item.TotalAailableWeight = item.TotalAailableWeight + utils.parseFloat(elem.AailableWeight);
                elem.Weight(0);
            });
            item.IsSelected(false);
            self.spotList.push(item);
        }
        var data = self.selectedSpots();
        if (index != 0 && index != data.length && (data[index - 1].WarehouseId != data[index].WarehouseId && data[index - 1].isOdd() == data[index].isOdd())) {
            for (var i = index, len = data.length; i < len; i++) {
                data[i].isOdd(!data[i].isOdd());
            }
        }
        utils.autoFormatString();
    };

    self.onAddSpots = function () {
        if (self.currentSelectedSpotsLength() == 0) {
            alert('请先从上面列表选择至少一条现货');
            return;
        }
        self.currentSelectedSpotsLength(0);
        var items = [], selectedItems = [], isOdd;
        $.each(self.spotList(), function (i, item) {
            if (item.IsSelected()) selectedItems.push(item);
            else items.push(item);
        });
        self.spotList(items);
        var selectedWarehouseId = selectedItems[0].WarehouseId, index = -1;
        for (var i = 0, data = self.selectedSpots(), len = data.length; i < len; i++) {
            if (data[i].WarehouseId == selectedWarehouseId) {
                index = i;
                if ((i + 1) < len && data[i + 1].WarehouseId != selectedWarehouseId) break;
            }
        }
        if (index == -1) {
            // append and set the style
            isOdd = self.selectedSpots().length == 0 ? false : !self.selectedSpots()[self.selectedSpots().length - 1].isOdd();
            $.each(selectedItems, function (i, item) {
                item.isOdd = ko.observable(isOdd);
                if (self.measureType() == self.commonModels.Enums.CommodityMeasureType.ByPiece) item.ContractDetails[0].ActualWeight(item.ContractDetails[0].Weight());
                self.selectedSpots.push(item);
            });
        } else {
            // insert and set the style
            isOdd = self.selectedSpots()[index].isOdd();
            $.each(selectedItems, function (i, item) {
                if (self.measureType() == self.commonModels.Enums.CommodityMeasureType.ByPiece) item.ContractDetails[0].ActualWeight(item.ContractDetails[0].Weight());
                item.isOdd = ko.observable(isOdd);
                self.selectedSpots.splice(index + 1, 0, item);
            });
        }
        utils.autoFormatString();
    };

    function toJS() {
        function mappingSpot(data) {
            var weight = 0;
            $.each(data.ContractDetails, function (i, item) {
                tracks.push({
                    SourceWarehouseStorageId: item.WFWarehouseStorageId,
                    ObjectType: 0,
                    Weight: item.Weight(),
                    ActualWeight: item.ActualWeight(),
                    DeliveryOrderCode: data.DeliveryOrderCode()
                });
            });
        }
        var tracks = [];
        $.each(self.selectedSpots(), function (i, item) {
            mappingSpot(item);
        });
        return $.extend({}, ko.mapping.toJS(self.viewModel, mappingviewModelOpts), { WFWhStorageFlowTracks: tracks });
    }

    self.onSave = function () {
        if (!preSave()) return;
        base._postThenBack(actions.saveUrl, toJS());
    };

    function onSelectedChanged(newVal, item) {
        if (newVal) {
            self.currentSelectedSpotsLength(self.currentSelectedSpotsLength() + 1);
            $.each(item.ContractDetails, function (j, elem) {
                elem.Weight(elem.AailableWeight);
            });
        } else {
            self.currentSelectedSpotsLength(Math.max(0, self.currentSelectedSpotsLength() - 1));
            $.each(item.ContractDetails, function (j, elem) {
                elem.Weight(0);
            });
        }
        setTimeout(utils.formatDecimal, 1);
    }

    function preSave() {
        var result = true, pledgeStartDate = moment($('#PledgeStartDate').val(), 'YYYY-MM-DD').toDate(), maxDate;
        if (self.selectedSpots().length == 0) {
            alert('请先查询并勾选将被质押的现货');
            return false;
        }
        $.each(self.selectedSpots(), function (i, item) {
            if (!maxDate || maxDate.valueOf() < new Date(item.EntryTime).valueOf()) maxDate = new Date(item.EntryTime);
        });
        if (pledgeStartDate.valueOf() < maxDate.valueOf()) {
            alert('质押日期必须晚于所选质押现货的最大入库日期' + moment(maxDate).format('YYYY-MM-DD'));
            return;
        }
        return true;
    }

    function toCamelCase(str) {
        if (!!!str) return str;
        return str.substr(0, 1).toLowerCase() + str.substr(1);
    }

    function setDefaults() {
        self.viewModel.pledgeType(1);
    }

    function resetByCommodity(id) {
        if (id === undefined) return;
        self.query.commodityId(id);
        self.measureType(($.grep(self.commonModels.AllCommodities, function (item) { return item.id == id; })[0] || {}).measureType);
        for (var i = 0; i < models.AllCommodities.length; i++) {
            var commodity = models.AllCommodities[i];
            if (commodity.id == id) {
                self.brands(commodity.brands.slice(0));
                self.specifications(commodity.specifications.slice(0));
                self.accountingEntities(commodity.accountEntities.slice(0));
                break;
            }
        }
    }

    function constructViewModel() {
        var result = {
            wFWhStorageFlowTrackId: ko.observable(),
            commodityId: ko.observable(),
            price: ko.observable(),
            currencyId: ko.observable(),
            pledgeType: ko.observable(),
            customerId: ko.observable(),
            purchaseContractId: ko.observable(),
            accountEntityId: ko.observable(),
            thirdPartyCustomer: ko.observable(),
            pledgeRate: ko.observable(),
            pledgeInterestRate: ko.observable(),
            pledgeAmount: ko.observable(),
            pledgeStartDate: ko.observable(),
            note: ko.observable(),
            isSpotPledge: true
        };
        result.commodityId.subscribe(function (newVal) {
            self.spotList.removeAll();
        });
        return result;
    }
    function constructQuery() {
        return {
            warehouseId: ko.observable(),
            commodityId: ko.observable(),
            brandId: ko.observable(),
            specificationId: ko.observable(),
            CardCode: ko.observable(),
            dateRange: ko.observable(),
            isSpot: true
        };
    }

    self.invalids = {
        main: ko.observable()
    };
    self.customShowErrors = ko.observable();
    utils.setCustomShowErrors(self.customShowErrors);
    self.setCustomShowErrors = {
        main: function () { self.customShowErrors(self.invalids.main); },
        noop: function () { self.customShowErrors($.noop); }
    };
};

$(document).ready(function () {
    GMK.Storage.ImpawnSpotRecords.start();
});