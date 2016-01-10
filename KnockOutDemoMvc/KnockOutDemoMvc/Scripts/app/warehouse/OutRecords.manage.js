"use strict";
var ns = utils.namespace('GMK.Settlement.OutRecords');

ns.start = function (data) {
    var $routeElem = $("#gmk-route"), route = {
        baseUrl: 'Warehouse/',
        action: $routeElem.data("action"),
        id: $routeElem.data("id"),
        contractId: $routeElem.data("contractid"),
        spotReceiptConvertInfoId: $routeElem.data("spotreceiptconvertinfoid"),
        storageConvertId: $routeElem.data('storageconvertid')
    };
    GMK.Features.CommonModels.onReady(function (models) {
        var viewModel;
        var currentContractCode = null;
        function _handleBasicSetting() {
            if (!viewModel.basicSettings.isValid()) return false;
            viewModel.basicSettings.notifySubscribers(true);
            viewModel.basicSettings.disabled(true);
            viewModel.basicSettings.disabled1(viewModel.basicSettings.consignmentType() != viewModel.commonModels.Enums.SpotSendType.General);
            viewModel.basicSettings.queriedCommodity((function computedCommodity() {
                if ((viewModel.basicSettings.consignmentType() == viewModel.commonModels.Enums.SpotSendType.General) ||
                    (viewModel.basicSettings.consignmentType() == viewModel.commonModels.Enums.SpotSendType.TransferWarehouse)) {
                    return viewModel.basicSettings.selectedCommodity();
                } else if (viewModel.basicSettings.consignmentType() == viewModel.commonModels.Enums.SpotSendType.ForContract) {
                    if (viewModel.basicSettings.selectedContracts() && viewModel.basicSettings.selectedContracts().length) {
                        return viewModel.basicSettings.selectedContracts()[0].CommodityId;
                    } else {
                        return '';
                    }
                }
            })());
            if (viewModel.basicSettings.consignmentType() == viewModel.commonModels.Enums.SpotSendType.ForContract) {
                if (viewModel.basicSettings.selectedContracts().length == 1 && viewModel.basicSettings.selectedContracts()[0].WFContractDetailInfoes.length == 1) {
                    var contract = viewModel.basicSettings.selectedContracts()[0];
                    //, contractDetail = contract.WFContractDetailInfoes[0];
                    if (currentContractCode != contract.ContractCode) {
                        //alert('所有选择的{0}都将被自动关联至合同 {5} 的唯一明细：{1}-{2}-{3}-{4}'.format(viewModel.basicSettings.isSpot() ? '现货' : '仓单',
                        //    viewModel.commonModels.findBrand(contractDetail.BrandId, contract.CommodityId),
                        //    viewModel.commonModels.findSpecification(contractDetail.SpecificationId, contract.CommodityId),
                        //    contractDetail.Weight, contractDetail.Price, contract.ContractCode));
                        viewModel.setStepVisible(2, false);
                        $('#OutRecordWizard .nav li:has([data-toggle="tab"]):eq(2) > a').attr('data-toggle', '');
                        currentContractCode = contract.ContractCode;
                    }
                } else {
                    $('#OutRecordWizard .nav li:has([data-toggle!="tab"]) > a').attr('data-toggle', 'tab');
                    viewModel.setStepVisible(2, true);
                }
            }
            return true;
        }
        function _handleAdvancedSetting() {
            if (!viewModel.outRecordViewModel.isValid()) return false;
            viewModel.outRecordViewModel.notifySubscribers(true);
            return true;
        }
        if (route.action == 'Manage') {
            viewModel = new ns.ManageWizardViewModel(models, {
                action: route.action,
                loadContractUrl: route.baseUrl + 'GetContract',
                contractId: route.contractId,
                spotReceiptConvertInfoId: route.spotReceiptConvertInfoId,
                storageConvertId: route.storageConvertId,
                loadUrl: route.baseUrl + 'GetOutRecordDetails',
                id: route.id || '',
                searchContractsUrl: route.baseUrl + 'ListContracts',
                searchSpotReceiptConvertInfoUrl: route.baseUrl + '',
                searchSpotsUrl: route.baseUrl + 'ListSpots',
                searchReceiptsUrl: route.baseUrl + 'ListReceipts',
                saveUrl: route.baseUrl + 'SaveOutRecord',
                listUrl: route.baseUrl + 'OutRecords',
                listContractDetailsByCardCodeUrl: route.baseUrl + 'ListContractDetailsByCardCode',
                generateDeliveryOrderCodeUrl: route.baseUrl + 'GenerateDeliveryOrderCode',
                setOutRecordStatusByIdUrl: route.baseUrl + 'SetOutRecordStatusById',
                validateOutRecordUrl: route.baseUrl + 'ValidateOutRecord',
                searchMakeRecordsUrl: 'Storage/ListMakeRecords',
                listContactsUrl: 'Contact/ListContactRecordsSimple',
                searchStorageConvertsUrl: 'Warehouse/ListStorageConvert',
                getStorageConvertUrl: 'Warehouse/GetStorageConvetForEntry',
                requestCreateUrl: data.requestCreateUrl,
                makeRecordsUrl: data.makeRecordsUrl
            });
            viewModel.initialize(function (data) {
                if (data.record.SendType == models.Enums.SpotSendType.ForContract && data.association.length == 1 && data.association[0].WFContractDetailInfoes.length == 1) currentContractCode = data.association[0].ContractCode;
            });
            $('#OutRecordWizard').bootstrapWizard({
                tabClass: 'nav',
                onNext: function ($activeTab, $navigation/*, nextIndex*/) {
                    var currentHref = $($activeTab.children('a')[0]).attr('href');
                    switch (currentHref) {
                        case '#BasicSettingsStep':
                            if (!_handleBasicSetting()) return false;
                            break;
                        case '#AdvancedSettingsStep':
                            if (!_handleAdvancedSetting()) return false;
                            break;
                    }

                    var isLast = $(this.nextSelector).hasClass('finish');
                    if (isLast) viewModel.saveOutRecord();
                    return !isLast;
                },
                onTabClick: function ($activeTab, $navigation, currentIndex, clickedIndex) {
                    if (clickedIndex == currentIndex) return false;
                    switch (currentIndex) {
                        case 0:
                            return _handleBasicSetting();
                        case 1:
                            return _handleAdvancedSetting();
                    }
                },
                onFixNavigationButton: function (opts) {
                    if (opts.isLast) $('.btn-actions').addClass('in');
                    else $('.btn-actions').removeClass('in');
                },
                onTabShow: function ($activeTab, $navigation, currentIndex) {
                    viewModel.currentStep(viewModel.steps()[currentIndex]);
                },
                onTabChange: function ($activeTab, $navigation, currentIndex, nextTab) {
                }
            });
            ko.applyBindings(viewModel);
            viewModel.commonModels.registerQueryFormEvent();
        }
    });
};

var BasicSettingChangeTopic = 'BasicSettingChange';
var OutDetailsChangeTopic = 'OutDetailsChange';
var OnInitializeTopic = 'OnInitialize';
ns.ManageWizardViewModel = function (models, options) {
    var self = this;
    var root = self;
    var base = GMK.Features.FeatureBase;
    self.redirectUrl = $.url().param('redirect');
    self.commonModels = models;
    self.isCreate = !options.id;
    self.isTemphold = ko.observable(false);
    self.origIsTemphold = ko.observable(false);
    self.isConnectedContract = ko.observable(false);
    self.approvalStatus = ko.observable();
    self.basicSettings = new BasicSettingsViewModel(root, options, models);
    self.outRecordViewModel = new OutRecordViewModel(root, options, models);
    self.linktoContractViewModel = new LinkToContractViewModel(models);
    self.steps = ko.observableArray([self.basicSettings, self.outRecordViewModel, self.linktoContractViewModel]);
    self.currentStep = ko.observable(self.basicSettings);
    self.lastStep = ko.computed(function () {
        return self.steps().filter(function (r) {
            return r.visible();
        }).slice(-1)[0];
    });
    self.setStepVisible = function (index, visible) {
        self.steps()[index].visible(visible);
        $('#OutRecordWizard').bootstrapWizard(visible ? 'display' : 'hide', index);
    };
    self.confirmSaveViewModel = new ConfirmSaveViewModel();

    self.isTemphold.subscribe(function (newVal) {
        if (newVal) {
            self.outRecordViewModel.openBillTime(null);
            self.outRecordViewModel.outType(null);
            self.outRecordViewModel.outDate(null);
        } else {
            if (!self.outRecordViewModel.openBillTime()) {
                self.outRecordViewModel.openBillTime(moment().startOf('day').toJSON());
            }
        }
    });

    function _saveOutRecord(data, callback) {
        self.confirmSaveViewModel.onHide();
        base._post(options.saveUrl, data, function (result) {
            if (!result.Message) {
                if (callback) callback(result);
                return;
            }
            self.confirmSaveViewModel.message(result.Message);
            self.confirmSaveViewModel.isBack = false;
            self.confirmSaveViewModel.submitCallback(function () {
                base._post(options.setOutRecordStatusByIdUrl, { id: result.Data.WFWarehouseOutRecordId }, function (result) {
                    self.confirmSaveViewModel.onCancel();
                    if (callback) callback(result); // after file is downloaded, it will be backward automatically
                });
            });
            self.confirmSaveViewModel.cancelCallback(function () {
                if (callback) callback(result);
            });
            self.confirmSaveViewModel.onShow();
        });
    }
    function _presaveForNonContract() {
        if (!self.outRecordViewModel.isValid()) {
            alert('发货信息验证未通过，请检查输入项');
            return null;
        }
        if (!self.outRecordViewModel.checkSave()) return null;
        var data = self.outRecordViewModel.getOutRecordDescription();
        data.SendType = self.basicSettings.consignmentType();
        data.WFWarehouseOutRecordDetails = self.outRecordViewModel.getOutDetails();
        return data;
    }
    function _saveOutRecordInternal(callback) {
        var data, spotReceiptConvertInfoId, storageconvertId;
        switch (self.outRecordViewModel.consignmentType()) {
            case models.Enums.SpotSendType.General:
            case models.Enums.SpotSendType.TransferWarehouse:
                data = _presaveForNonContract();
                if (data == null) return;
                break;
            case models.Enums.SpotSendType.MakeReceipt:
                data = _presaveForNonContract();
                if (data == null) return;
                spotReceiptConvertInfoId = options.spotReceiptConvertInfoId || self.basicSettings.selectedSpotReceiptConvertInfos()[0].WFSpotReceiptConvertInfoId;
                $.each(data.WFWarehouseOutRecordDetails, function (i, item) {
                    $.each(item.WFContractOutRecordDetails, function (j, cd) {
                        cd.ObjectId = spotReceiptConvertInfoId;
                    });
                });
                break;
            case models.Enums.SpotSendType.StorageConvert:
                data = _presaveForNonContract();
                if (data == null) return;
                storageconvertId = options.storageconvertId || self.basicSettings.selectedStorageConverts()[0].WFStorageConversionId;
                $.each(data.WFWarehouseOutRecordDetails, function (i, item) {
                    $.each(item.WFContractOutRecordDetails, function (j, cd) {
                        cd.ObjectId = storageconvertId;
                        cd.ObjectType = models.Enums.SendReceiveObjectType.StorageConversion;
                    });
                });
                break;
            case models.Enums.SpotSendType.ForContract:
                data = self.outRecordViewModel.getOutRecordDescription();
                data.SendType = self.basicSettings.consignmentType();
                if (options.id || ((self.basicSettings.selectedContracts().length != 1) || (self.basicSettings.selectedContracts()[0].WFContractDetailInfoes.length != 1))) {
                    if (!self.linktoContractViewModel.checkSave()) return;
                    data.WFWarehouseOutRecordDetails = ko.mapping.toJS(self.outRecordViewModel.getOutDetails());
                } else {
                    var contractDetailId = self.basicSettings.selectedContracts()[0].WFContractDetailInfoes[0].WFContractDetailInfoId;
                    data.WFWarehouseOutRecordDetails = $.map(self.outRecordViewModel.getOutDetails(), function (item) {
                        $.each(item.WFContractOutRecordDetails, function (j, cd) {
                            cd.ObjectId = contractDetailId;
                        });
                        return item;
                    });
                }
                break;
        }
        data.IsTemphold = self.isTemphold();
        if (self.basicSettings.isPreDelivery()) data.OpenBillTime = null;
        if (data.whStorageType == models.Enums.InventoryStorageType.BillOfLading ||
                data.whStorageType == models.Enums.InventoryStorageType.WarehouseReceipt) data.DeliveryOrderCode = data.WFWarehouseOutRecordDetails[0].GroupCode;
        //var summary = data.ContractWeightSummary = {}, oldContractOutRecordDetails = data.WFWarehouseOutRecordDetails, key;
        //$.each(oldContractOutRecordDetails, function (i, item) {
        //    key = "" + item.WFContractDetailInfoId;
        //    var weight = (item.ActualWeight == undefined || item.ActualWeight == 0) ? item.Weight : item.ActualWeight;
        //    if (summary[key] == undefined) summary[key] = utils.parseFloat(weight);
        //    else summary[key] = summary[key] + utils.parseFloat(weight);
        //});
        //var oldContractOutRecordDetails = data.WFWarehouseOutRecordDetails;
        //data.WFWarehouseOutRecordDetails = null;
        base._post(options.validateOutRecordUrl, data, function (result) {
            if (!result.Message) {
                //delete data.ContractWeightSummary;
                //data.WFWarehouseOutRecordDetails = oldContractOutRecordDetails;
                _saveOutRecord(data, callback);
                return;
            }
            self.confirmSaveViewModel.message(result.Message);
            self.confirmSaveViewModel.isBack = false;
            self.confirmSaveViewModel.submitCallback(function () {
                //delete data.ContractWeightSummary;
                //data.WFWarehouseOutRecordDetails = oldContractOutRecordDetails;
                _saveOutRecord(data, callback);
            });
            self.confirmSaveViewModel.onShow();
        });
    }
    function _jumpBack() {
        if (options.spotReceiptConvertInfoId) window.location.href = options.makeRecordsUrl;
        else { //处理跳转页面
            var redirectUrl = self.redirectUrl;
            if (!redirectUrl || redirectUrl[0] !== '/') {
                History.back();
            } else
                window.location.href = redirectUrl;
        }
    }

    var _methods = {
        saveOutRecord: function () {
            _saveOutRecordInternal(function (/*result*/) {
                _jumpBack();
                //if (result.Data.RiskInfo.NeedsApproval) {
                //    confirm('提单已超限，是否立即提交审批？', function () {
                //        window.location = 'WorkflowMessage/RequestCreate?' + $.param({
                //            objectId: result.Data.WFWarehouseOutRecordId,
                //            flowType: models.Enums.ApprovalType.DeliveryBill,
                //            redirect: 'Warehouse/OutRecords'
                //        });
                //    }, function () {
                //        _jumpBack();
                //    });
                //} else {
                //    _jumpBack();
                //}
            });
        },
        saveAndExport: function () {
            _saveOutRecordInternal(function (result) {
                if (result.Data.printable) {
                    var url = utils.urlAction('DeliveryBill', 'Warehouse', { wFWarehouseOutRecordId: result.Data.WFWarehouseOutRecordId, downloadToken: true });
                    $.fileDownload(url, {
                        cookieName: 'downloadToken',
                        successCallback: function () {
                            _jumpBack();
                        },
                        failCallback: function () {
                            alert('导出提单失败');
                        }
                    });
                } else {
                    utils.alert('保存成功，现在不可导出此提单', _jumpBack);
                }
            });
        },
        onSaveAndReqestApprove: function () {
            _saveOutRecordInternal(function (result) {
                location.href = options.requestCreateUrl + '?' + $.param({
                    objectId: result.Data.WFWarehouseOutRecordId,
                    flowType: models.Enums.ApprovalType.DeliveryBill,
                    redirect: 'Warehouse/OutRecords'
                });
            });
        },
        initialize: function (callback) {
            if (options.contractId) {
                PubSub.publish(OnInitializeTopic, {
                    contractId: options.contractId
                });
            } else if (options.spotReceiptConvertInfoId) {
                PubSub.publish(OnInitializeTopic, {
                    spotReceiptConvertInfoId: options.spotReceiptConvertInfoId
                });
            } else if (options.storageConvertId) {
                PubSub.publish(OnInitializeTopic, {
                    storageConvertId: options.storageConvertId
                });
            } else if (options.id) {
                base._get(options.loadUrl, { id: options.id }, function (data) {
                    data.record.IsPreDelivery = !data.record.WFWarehouseOutRecordDetails[0].WFWarehouseStorageId;
                    self.isTemphold(data.record.IsTemphold);
                    self.origIsTemphold(data.record.IsTemphold);
                    self.approvalStatus(data.record.ApprovalStatus);
                    PubSub.publish(OnInitializeTopic, {
                        id: options.id,
                        outRecord: data.record,
                        association: data.association || []
                    });
                    if (callback) callback(data);
                });
            }
        }
    };
    $.extend(this, _methods);

    ko.SlimCheckExtension.call(self.outRecordViewModel, self.outRecordViewModel.spotList, {
        rowkeyCallback: function (elem) {
            if (elem.WFWarehouseStorage) return elem.WFWarehouseStorage.WFWarehouseStorageId;
            return ((elem.WFWarehouseStorageId) ? elem.WFWarehouseStorageId : elem.ContractDetails[0].WFWarehouseStorageId);
        }
    });
    ko.SlimCheckExtension.call(self.outRecordViewModel, self.outRecordViewModel.receiptList, {
        rowkeyCallback: function (elem) {
            if (elem.WFWarehouseStorage) return elem.WFWarehouseStorage.WFWarehouseStorageId;
            return elem.WFWarehouseStorageId;
        }
    });
    //ko.SlimCheckExtension.call(self.linktoContractViewModel, self.linktoContractViewModel.outDetails, {
    //    rowkeyCallback: function (elem) {
    //        return ((elem.WFWarehouseStorageId) ? elem.WFWarehouseStorageId : elem.ContractDetails[0].WFWarehouseStorageId);
    //    }
    //});
};

//
// @initValue - the items with same group code which are being splitted
// @splittingItem - current splitting item, used as template when saving split details.
// @contractDetails - the control details being linked
//
function SplitOutDetailsViewModel(initValue, splittingItem, contractDetails) {
    var self = this;
    this.editingDetailsInGroup = ko.observableArray();
    this.addingItem = new SplitOutDetailViewModel();
    this.settingContractDetails = ko.observableArray();
    this.contractDetails = null;
    this.splittingItem = null;
    this.totalWeight = ko.observable(0);
    this.totalActualWeight = ko.observable(0);

    this.onAdd = function () {
        self.editingDetailsInGroup.push(new SplitOutDetailViewModel(
            self.addingItem.ContractDetailText(), self.addingItem.ObjectId, null, null,
            self.addingItem.ActualWeight(),
            self.addingItem.Weight()));
        self.addingItem.reset();
    };
    this.onRemove = function (item) {
        self.editingDetailsInGroup.remove(item);
    };
    var editingItem = null;
    this.onSelectContractDetail = function (item) {
        editingItem = item;
        self.settingContractDetails.removeAll();
        self.settingContractDetails($.grep(self.contractDetails, function (elem) {
            return $.grep(self.editingDetailsInGroup(), function (term) {
                return term.ContractDetailText() == elem.DisplayText;
            }).length == 0;
        }));
    };
    this.onSelectSettingContractDetail = function (item) {
        if (!editingItem) return;
        editingItem.ContractDetailText(item.DisplayText);
        editingItem.ObjectId = item.Data.WFContractDetailInfoId;
        editingItem.BrandId(item.Data.BrandId);
        editingItem.SpecificationId(item.Data.SpecificationId);
        editingItem = null;
    };
    if (initValue && splittingItem && contractDetails) {
        this.initialize(initValue, splittingItem, contractDetails);
    }
}
SplitOutDetailsViewModel.prototype = {
    initialize: function (initValue, splittingItem, contractDetails) {
        this.editingDetailsInGroup.removeAll();
        this.editingDetailsInGroup(initValue);
        this.splittingItem = splittingItem;
        this.contractDetails = contractDetails;
    },
    isValid: function () {
        var currentTotalWeight = 0, currentTotalActualWeight = 0;
        $.each(this.editingDetailsInGroup(), function (i, item) {
            currentTotalWeight += utils.parseFloat(item.Weight());
            currentTotalActualWeight += utils.parseFloat(item.ActualWeight());
        });
        var weight = utils.parseFloat(this.addingItem.Weight()), actualWeight = utils.parseFloat(this.addingItem.ActualWeight());
        if (weight || actualWeight) {
            currentTotalWeight += weight;
            currentTotalActualWeight += actualWeight;
        }
        return (Math.abs(currentTotalWeight - this.totalWeight()) < Math.Epsilon && Math.abs(currentTotalActualWeight - this.totalActualWeight()) < Math.Epsilon);
    },
    getList: function () {
        var result = this.editingDetailsInGroup(),
            weight = utils.parseFloat(this.addingItem.Weight()), actualWeight = utils.parseFloat(this.addingItem.ActualWeight());
        if (weight || actualWeight) result.push(this.addingItem);
        return ko.mapping.toJS(result);
    }
};

function SplitOutDetailViewModel(contractDetailText, objectId, brandId, specificationId, actualWeight, weight, wfContractOutRecordDetailId) {
    this.ContractDetailText = ko.observable(contractDetailText || '选择合同明细');
    this.ObjectId = objectId;
    this.BrandId = ko.observable(brandId);
    this.SpecificationId = ko.observable(specificationId);
    this.ActualWeight = ko.observable(actualWeight);
    this.Weight = ko.observable(weight);
    this.WFContractOutRecordDetailId = wfContractOutRecordDetailId;
}
SplitOutDetailViewModel.prototype.reset = function () {
    this.ContractDetailText('选择合同明细');
    this.ObjectId = null;
    this.BrandId(null);
    this.SpecificationId(null);
    this.ActualWeight('');
    this.Weight('');
    this.WFContractOutRecordDetailId = null;
};

function BasicSettingsViewModel(root, options, models) {
    var self = this;
    var base = GMK.Features.FeatureBase;
    this.visible = ko.observable(true);
    this.disabled = ko.observable(); // for general outry
    this.disabled1 = ko.observable(); // for contract outry
    this.disabled1_1 = ko.observable(); // for contract selection
    this.disabled2 = ko.observable(); // for commodity type
    this.queriedCommodity = ko.observable();
    this.queriedCustomer = ko.observable();
    self.contractTypeToquery = ko.observable();
    self.contractType = ko.observable();
    self.accountEntityIdToquery = ko.observable();
    self.accountEntityId = ko.observable();

    this.consignmentType = ko.observable(models.Enums.SpotSendType.ForContract);
    this.consignmentType.subscribe(function (newVal) {
        var spotSendTypeEnum = models.Enums.SpotSendType;
        if (newVal != models.Enums.SpotSendType.ForContract) {
            root.setStepVisible(2, false);
            $('#OutRecordWizard .nav li:has([data-toggle="tab"]):eq(2) > a').attr('data-toggle', '');
        } else {
            $('#OutRecordWizard .nav li:has([data-toggle!="tab"]) > a').attr('data-toggle', 'tab');
            root.setStepVisible(2, true);
        }
        if (!self.disabled()) {
            if (newVal == spotSendTypeEnum.TransferWarehouse) {
                self.whStorageType(models.Enums.InventoryStorageType.Spot);
                self.isPreDelivery(false);
                self.disabled2(true);
            } else {
                self.disabled2(false);
            }
        }
        if (newVal == spotSendTypeEnum.MakeReceipt) {
            self.whStorageType(models.Enums.InventoryStorageType.Spot);
            self.isPreDelivery(false);
            self.disabled2(true);
        } else if (newVal == spotSendTypeEnum.StorageConvert) {
            if (self.selectedStorageConverts().length) _onStorageConvertChange(self.selectedStorageConverts()[0]);
        }
    });
    this.selectedContracts = ko.observableArray();
    this.whStorageType = ko.observable(models.Enums.InventoryStorageType.Spot);
    this.whStorageType.subscribe(function (newVal) {
        if (newVal == models.Enums.InventoryStorageType.Spot) {
            self.isPreDelivery(false);
        }
    });
    this.isPreDelivery = ko.observable();
    this.origIsPreDelivery = ko.observable();
    this.selectedCommodity = ko.observable();

    this.contractList = ko.observableArray();
    this.selectedSpotReceiptConvertInfos = ko.observableArray();
    this.spotReceiptConvertInfoList = ko.observableArray();
    this.selectedStorageConverts = ko.observableArray();
    this.storageConvertList = ko.observableArray();

    this.selectedContractLength = ko.computed(function () {
        var count = 0;
        if (self.contractList()) {
            $.each(self.contractList(), function (i, item) {
                if (item.isSelected()) count++;
            });
        }
        return count;
    });

    var _prevCheckedSpotReceiptConvertInfo;

    var _methods = {
        onPreSelectSpotReceiptConvertInfos: function () {
        },
        onSelectStorageConvert: function (item) {
            self.selectedStorageConverts.removeAll();
            self.selectedStorageConverts.push(item);
            $('#SelectStorageConvertModal').modal('hide');
            _onStorageConvertChange(item);
        },
        onRemoveStorageConvert: function (item) {
            self.selectedStorageConverts.remove(item);
            self.disabled2(false);
        },
        onRemoveSpotReceiptConvertInfo: function (item) {
            self.selectedSpotReceiptConvertInfos.remove(item);
        },
        onSearchSpotReceiptConvertInfos: function () {
            var param = $.extend(utils.serialize('#SelectSpotReceiptConvertForm > .gmk-data-field'), {
                AccountingEntityId: self.accountEntityIdToquery()
            });
            self.accountEntityId(param.AccountingEntityId);
            base._get(options.searchMakeRecordsUrl, param, function (data) {
                $.each(data.result, function (i, item) {
                    item.isSelected = ko.observable();
                    item.isSelected.subscribe(function (newVal) {
                        if (newVal && _prevCheckedSpotReceiptConvertInfo && ko.isObservable(_prevCheckedSpotReceiptConvertInfo)) {
                            _prevCheckedSpotReceiptConvertInfo(false);
                        }
                        if (newVal) _prevCheckedSpotReceiptConvertInfo = this;
                    }, item.isSelected);
                });
                self.spotReceiptConvertInfoList(data.result);
            });
        },
        onSelectSpotReceiptConvertInfo: function () {
            self.selectedSpotReceiptConvertInfos($.grep(self.spotReceiptConvertInfoList(), function (item) {
                return item.isSelected();
            }));
        },
        onCancelSelectSpotReceiptConvertInfo: function () {
            if (_prevCheckedSpotReceiptConvertInfo && ko.isObservable(_prevCheckedSpotReceiptConvertInfo)) _prevCheckedSpotReceiptConvertInfo(false);
            if (self.selectedSpotReceiptConvertInfos().length) self.selectedSpotReceiptConvertInfos()[0].isSelected(true);
        },
        onPreSelectStorageConverts: function () {
        },
        onSearchStorageConverts: function () {
            var param = utils.serialize('#SelectStorageConvertForm .gmk-data-field', true);
            if (param.dateRange != null) {
                param.startDate = param.dateRange.split(' - ')[0];
                param.endDate = param.dateRange.split(' - ')[1];
            }

            param.warehouseEntryHappened = false;
            param.warehouseOutHappened = false;
            base._get(options.searchStorageConvertsUrl, param, function (result) {
                self.storageConvertList(result.Data);
            });
        },
        onPreSelectContracts: function () {
            if (self.selectedContracts().length) {
                self.queriedCustomer(self.selectedContracts()[0].CustomerId);
                self.queriedCommodity(self.selectedContracts()[0].CommodityId);
            } else {
                self.queriedCustomer(null);
                if (!self.disabled()) self.queriedCommodity(null);
            }
        },
        onRemoveContract: function (item) {
            self.selectedContracts.remove(item);
            var filteredContracts = $.grep(self.contractList(), function (elem) {
                return elem.WFContractInfoId == item.WFContractInfoId;
            });
            if (filteredContracts.length) filteredContracts[0].isSelected(false);
        },
        enableSelectContract: ko.computed(function () {
            var checkedContracts = $.grep(self.contractList(), function (item) {
                return item.isSelected();
            });
            if (!checkedContracts.length) {
                return false;
            }
            var m = {}, types = [];
            $.each(checkedContracts, function (i, r) {
                if (m[r.ContractType]) {
                    m[r.ContractType] = 1 + m[r.ContractType];
                } else {
                    types.push(r.ContractType);
                    m[r.ContractType] = 1;
                }
            });
            if (m[models.Enums.ContractType.PledgeContract] > 1) {
                return false;
            }
            if (types.length > 1) {
                return false;
            }
            return true;
        }),
        isForPledgeContract: ko.computed(function () {
            return $.map(self.selectedContracts(), function (r) {
                return r.ContractType;
            })[0] === models.Enums.ContractType.PledgeContract;
        }),
        onSelectContract: function () {
            self.selectedContracts($.grep(self.contractList(), function (item) {
                return item.isSelected();
            }));
            self.removeOrds = true;
            return;

            if (!self.selectedContracts() || self.selectedContracts().length == 0) {
                self.selectedContracts($.grep(self.contractList(), function (item) {
                    return item.isSelected();
                }));
            } else {
                var oldSelected = self.selectedContracts();
                $.each(self.contractList(), function (i, item) {
                    if (!item.isSelected()) {
                        for (i = 0; i < oldSelected.length; i++) {
                            if (oldSelected[i].WFContractInfoId == item.WFContractInfoId) {
                                oldSelected.splice(i, 1);
                                break;
                            }
                        }
                    } else {
                        oldSelected.push(item);
                    }
                });
                self.selectedContracts(oldSelected.getUnique(function (item) {
                    return item.WFContractInfoId;
                }));
            }
        },
        onCancelSelectContract: function () {
            if (self.selectedContracts() && self.selectedContracts().length) {
                $.each(self.contractList(), function (i, item) {
                    if ($.grep(self.selectedContracts(), function (elem) {
                        return elem.WFContractInfoId == item.WFContractInfoId;
                    }).length == 0) item.isSelected(false);
                    else item.isSelected(true);
                });
            } else {
                $.each(self.contractList(), function (i, item) {
                    item.isSelected(false);
                });
            }
        },
        onSearchContract: function () {
            var param = $.extend(utils.serialize('#SearchContractForm > .gmk-data-field'), {
                IsBuy: false,
                AccountingEntityId: self.accountEntityIdToquery()
            });
            self.accountEntityId(param.AccountingEntityId);
            base._get(options.searchContractsUrl, param, function (data) {
                var checkSelection = self.selectedContracts() && self.selectedContracts().length;
                $.each(data, function (i, item) {
                    item.isSelected = ko.observable();
                    if (checkSelection) {
                        if ($.grep(self.selectedContracts(), function (elem) {
                            return elem.WFContractInfoId == item.WFContractInfoId;
                        }).length) item.isSelected(true);
                    }
                });
                self.contractList(data);
            });
        },
        notifySubscribers: function (isSync) {
            if (isSync) PubSub.publishSync(BasicSettingChangeTopic, _getPublishData());
            else PubSub.publish(BasicSettingChangeTopic, _getPublishData());
        },
        isValid: function () {
            switch (parseInt(self.consignmentType(), 10)) {
                case models.Enums.SpotSendType.ForContract:
                    if (!self.selectedContracts() || self.selectedContracts().length == 0) {
                        alert('合同发货时，请选择至少一个合同');
                        return false;
                    }
                    break;
                case models.Enums.SpotSendType.General:
                case models.Enums.SpotSendType.TransferWarehouse:
                    if (!self.selectedCommodity()) {
                        alert('直接发货时，请选择品种');
                        return false;
                    }
                    break;
                case models.Enums.SpotSendType.MakeReceipt:
                    if (!self.selectedSpotReceiptConvertInfos() || self.selectedSpotReceiptConvertInfos().length == 0) {
                        alert('制单发货时，请选择至少一个制单记录');
                        return false;
                    }
                    break;
            }
            if (!this.whStorageType()) {
                alert('请选择货品类型');
                return false;
            }
            return true;
        },
        initialize: function (options) {
            if (options.contractId) {
                self.disabled1(true);
                self.disabled1_1(true);
                self.disabled(true);
                return _getByContractId(options.contractId);
            } else if (options.spotReceiptConvertInfoId) {
                self.disabled1(true);
                self.disabled1_1(true);
                self.disabled(true);
                self.consignmentType(models.Enums.SpotSendType.MakeReceipt);
                $('#MakeReceiptOutRecordType').trigger('click');
                return _getBySpotReceiptConvertInfoId(options.spotReceiptConvertInfoId);
            } else if (options.storageConvertId) {
                self.disabled1(true);
                self.disabled1_1(true);
                self.disabled(true);
                $('#StorageConvertOutRecordType').trigger('click');
                return _getByStorageConvertId(options.storageConvertId);
            } else if (options.id) {
                self.whStorageType(options.outRecord.WhStorageType);
                self.isPreDelivery(options.outRecord.IsPreDelivery);
                self.origIsPreDelivery(options.outRecord.IsPreDelivery);
                self.consignmentType(options.outRecord.SendType);
                if (self.consignmentType() == models.Enums.SpotSendType.ForContract) {
                    self.selectedContracts(options.association);
                    self.queriedCommodity(self.selectedContracts()[0].CommodityId);
                    self.disabled(true);
                    self.disabled1(true);
                    self.disabled2(true);
                } else if (self.consignmentType() == models.Enums.SpotSendType.MakeReceipt) {
                    //$('#MakeReceiptOutRecordType').trigger('click');
                    self.selectedSpotReceiptConvertInfos(options.association);
                    self.queriedCommodity(self.selectedSpotReceiptConvertInfos()[0].CommodityId);
                    self.disabled(true);
                    self.disabled1(true);
                    self.disabled1_1(true);
                    self.disabled2(true);
                } else if (self.consignmentType() == models.Enums.SpotSendType.StorageConvert) {
                    //$('#StorageConvertOutRecordType').trigger('click');
                    self.selectedStorageConverts(options.association);
                    self.disabled(true);
                    self.disabled1(true);
                    self.disabled1_1(true);
                    self.disabled2(true);

                } else {
                    self.disabled(true);
                    self.disabled2(true);

                    self.selectedCommodity(options.outRecord.CommodityId);
                    self.queriedCommodity(options.outRecord.CommodityId);
                    var nth = 0;
                    if (self.consignmentType() == models.Enums.SpotSendType.General) {
                        nth = 2;
                    } else if (self.consignmentType() == models.Enums.SpotSendType.TransferWarehouse) {
                        self.disabled1(true);
                        self.disabled1_1(true);
                        nth = 1;
                    }
                    if (nth) {
                        //// TODO: needs a better way
                        //// if the end user clicks from UI, other codes will handle accordion-content's visibility
                        //$('.accordion-content').removeClass('active');
                        //$($('.accordion-content')[nth]).addClass('active');
                    }
                }
                var deferred = $.Deferred();
                deferred.resolve();
                return deferred.promise();
            }
        }
    };
    $.extend(this, _methods);

    function _onStorageConvertChange(item) {
        self.whStorageType(item.SourceStorageType);
        self.disabled2(true);
        root.isTemphold(false);
        self.isPreDelivery(false);
    }
    function _getByContractId(contractId) {
        return base._get(options.searchContractsUrl, {
            contractId: contractId
        }, function (data) {
            self.selectedContracts(data);
            if (data[0]) {
                self.accountEntityId(data[0].AccountingEntityId);
            }
            if (data.length === 1 && data[0].WFContractDetailInfoes.length === 1) {
                root.setStepVisible(2, false);
                $('#OutRecordWizard .nav li:has([data-toggle="tab"]):eq(2) > a').attr('data-toggle', '');
            }
            self.whStorageType(data[0].WFContractDetailInfoes[0].IsSpot ? models.Enums.InventoryStorageType.Spot : models.Enums.InventoryStorageType.Receipt);
        });
    }
    function _getBySpotReceiptConvertInfoId(spotReceiptConvertInfoId) {
        return base._get(options.searchMakeRecordsUrl, {
            spotReceiptConvertInfoId: spotReceiptConvertInfoId
        }, function (data) {
            if (data.result[0]) {
                self.accountEntityId(data.result[0].AccountEntityId);
            }
            self.selectedSpotReceiptConvertInfos(data.result);
        });
    }
    function _getByStorageConvertId(storageconvertId) {
        return base._get(options.getStorageConvertUrl, {
            id: storageconvertId
        }, function (result) {
            self.consignmentType(models.Enums.SpotSendType.StorageConvert);
            self.selectedStorageConverts.push(result.Data);
            _onStorageConvertChange(result.Data);
            self.accountEntityId(result.Data.AccountEntityId);
        });
    }
    var prevCustomer, prevWarehouse;
    function _getPublishData() {
        var data = {
            consignmentType: +self.consignmentType()
        }, firstSpotReceiptConvertInfo, firstStorageConvert;
        switch (data.consignmentType) {
            case models.Enums.SpotSendType.ForContract:
                var firstContract = self.selectedContracts() && self.selectedContracts().length > 0 ? self.selectedContracts()[0] : null;
                //if (firstContract !== null && +firstContract.TransactionType !== models.Enums.TransactionType.Normal) {
                //    //非普通现货交易合同
                //    root.isConnectedContract(true);
                //} else
                root.isConnectedContract(firstContract !== null && +firstContract.TransactionType !== models.Enums.TransactionType.Normal);
                data.extraInfo = {
                    whStorageType: +self.whStorageType(),
                    isPreDelivery: self.isPreDelivery(),
                    selectedCommodity: firstContract ? firstContract.CommodityId : '',
                    selectedCustomer: firstContract ? firstContract.CustomerId : '',
                    selectedWarehouse: firstContract ? models.findWarehouseByShortName(firstContract.WFContractDetailInfoes[0].DeliveryAddress) : '',
                    selectedContracts: $.map(self.selectedContracts(), function (item) {
                        return {
                            id: item.WFContractInfoId,
                            code: item.ContractCode,
                            data: item
                        };
                    }),
                    accountEntityId: firstContract ? firstContract.AccountingEntityId : ''
                };
                if (data.extraInfo.selectedCustomer == prevCustomer) {
                    data.extraInfo.selectedCustomer = '';
                } else {
                    prevCustomer = data.extraInfo.selectedCustomer;
                }
                if (data.extraInfo.selectedWarehouse == prevWarehouse) {
                    data.extraInfo.selectedWarehouse = '';
                } else {
                    prevWarehouse = data.extraInfo.selectedWarehouse;
                }
                break;
            case models.Enums.SpotSendType.General:
            case models.Enums.SpotSendType.TransferWarehouse:
                data.extraInfo = {
                    whStorageType: +self.whStorageType(),
                    isPreDelivery: self.isPreDelivery(),
                    selectedCommodity: self.selectedCommodity()
                }
                break;
            case models.Enums.SpotSendType.MakeReceipt:
                firstSpotReceiptConvertInfo = self.selectedSpotReceiptConvertInfos()[0];
                data.extraInfo = {
                    whStorageType: +self.whStorageType(),
                    isPreDelivery: self.isPreDelivery(),
                    selectedCommodity: firstSpotReceiptConvertInfo.CommodityId,
                    selectedBrand: firstSpotReceiptConvertInfo.BrandId,
                    selectedWarehouse: firstSpotReceiptConvertInfo.WarehouseId,
                    selectedCustomer: firstSpotReceiptConvertInfo.ExchangeId,
                    requestDateForMakeReceipt: new Date(firstSpotReceiptConvertInfo.RequestDate),
                    accountEntityId: self.accountEntityId()
                };
                break;
            case models.Enums.SpotSendType.StorageConvert:
                firstStorageConvert = self.selectedStorageConverts()[0];
                data.extraInfo = {
                    whStorageType: +self.whStorageType(),
                    isPreDelivery: self.isPreDelivery(),
                    selectedCommodity: firstStorageConvert.CommodityId,
                    accountEntityId: firstStorageConvert.AccountEntityId,
                    selectedWarehouse: firstStorageConvert.SourceWarehouseId,
                    storageConversionExchangeId: firstStorageConvert.ExchangeId
                };
                break;
        }
        return data;
    }

    PubSub.subscribe(OnInitializeTopic, function (msg, data) {
        self.initialize(data).then(function () {
            self.notifySubscribers(true);
        });
    });
}

function OutRecordViewModel(root, options, models) {
    var self = this;
    var base = GMK.Features.FeatureBase;
    self.accountEntityId = ko.observable();
    this.visible = ko.observable(true);
    this.measureType = ko.observable();
    this.deliveryOrderCode = ko.observable();
    this.selectedWarehouse = ko.observable();
    this.selectedExchangeId = ko.observable(null);
    this.selectedCustomer = ko.observable();
    this.Customers = models._AllCustomers.concat(models._AllExchanges);
    this.note = ko.observable();
    this.outType = ko.observable();
    this.receiverName = ko.observable();
    this.receiverIdentityCard = ko.observable();
    this.receiverCarNumber = ko.observable();
    this.selectedUnit = ko.observable();
    this.openBillTime = ko.observable(moment().startOf('day').toJSON());
    this.outDate = ko.observable();
    this.spotOutDetails = ko.observableArray();
    this.brands = ko.observableArray([]);
    this.specifications = ko.observableArray([]);
    this.receiptOutDetails = ko.observableArray();
    this.spotList = ko.observableArray();
    this.selectedSpots = ko.observableArray();
    this.receiptList = ko.observableArray();
    this.selectedReceipts = ko.observableArray();
    this.totalWeightForSelectedReceipts = ko.observable(0);
    this.preDelivery = new PreDeliveryViewModel();
    this.contacts = ko.observableArray();

    self.currentOutDetail = {
        ActualWeight: ko.observable(),
        Weight: ko.observable(),
        DeliveryBundles: ko.observable(),
        PtlGrossWeight: ko.observable(),
        copyFrom: function (item) {
            this.ActualWeight(item.ActualWeight());
            this.Weight(item.Weight());
            this.DeliveryBundles(item.DeliveryBundles());
            this.PtlGrossWeight(item.PtlGrossWeight());
        }
    };

    this.whStorageType = ko.observable();
    this.consignmentType = ko.observable();
    this.isPreDelivery = ko.observable();
    this.selectedCommodity = ko.observable();

    var requestDateForMakeReceipt = null;
    var _isCustomerChanged = false;
    var _isSelectedWarehouseSuppressChange = false;
    var currentEditingDetail = null;
    var _isCommodityChanged = false;
    var _isAssignCustomer = true;
    this.receiptOutTotalWeight = ko.computed(function () {
        var sum = 0;
        $.each(self.receiptOutDetails(), function (i, n) {
            sum = utils.roundAmount(sum + utils.roundAmount(ko.isObservable(n.Weight) ? n.Weight() : n.Weight, models.settings.weightDigits), models.settings.weightDigits);
        });
        return sum;
    });
    this.spotOutTotalWeight = ko.computed(function () {
        var sum = 0;
        $.each(self.spotOutDetails(), function (i, n) {
            sum = utils.roundAmount(sum + utils.roundAmount(n.Weight(), models.settings.weightDigits), models.settings.weightDigits);
        });
        return sum;
    });
    this.totalWeightForSelectedSpots = ko.computed(function () {
        var total = 0, isWeight = self.measureType() == models.Enums.CommodityMeasureType.ByWeight,
            isNormalSpot = self.whStorageType() == models.Enums.InventoryStorageType.Spot;
        $.each(self.selectedSpots(), function (i, s) {
            var fixedWeight;
            if (isWeight && isNormalSpot) {
                fixedWeight = Number(s.Weight() || '0');
                if (isNaN(fixedWeight)) {
                    fixedWeight = 0;
                }
            } else {
                fixedWeight = utils.parseFloat(s.TotalAailableWeight());
            }
            total += fixedWeight;
        });
        return utils.round(total, models.settings.weightDigits);
    });
    this.outType.subscribe(function (newVal) {
        if (newVal != models.Enums.WarehouseOutType.LogisticsOut) {
            self.receiverIdentityCard('');
            self.receiverCarNumber('');
            self.receiverName('');
        }
    });
    this.accountEntityId.subscribe(function () {
        self.spotList.removeAll();
        self.receiptList.removeAll();
    });
    this.selectedExchangeId.subscribe(function () {
        self.spotList.removeAll();
        self.receiptList.removeAll();
    });
    this.selectedWarehouse.subscribe(function () {
        self.spotList.removeAll();
        self.receiptList.removeAll();
        if (_isSelectedWarehouseSuppressChange) {
            _isSelectedWarehouseSuppressChange = false;
            return;
        }
        var outDetails, queryResult, this_ = this, oldValue = this();
        if (self.whStorageType() == models.Enums.InventoryStorageType.Spot) {
            outDetails = self.spotOutDetails;
            queryResult = self.spotList;
        } else if (self.whStorageType() == models.Enums.InventoryStorageType.Receipt) {
            outDetails = self.receiptOutDetails;
            queryResult = self.receiptList;
        }
        if (!outDetails) return;
        if (outDetails().length > 0) {
            confirm('切换仓库将会导致已经添加的发货明细被清除，确认继续操作？', function () {
                outDetails.removeAll();
                queryResult.removeAll();
            }, function () {
                _isSelectedWarehouseSuppressChange = true;
                this_(oldValue);
            });
        }
    }, this.selectedWarehouse, 'beforeChange');
    this.selectedCustomer.subscribe(function (newValue) {
        _isCustomerChanged = true;
    });
    this.receiverName.subscribe(function (newValue) {
        var contact = $.grep(self.contacts(), function (item) {
            return item.LinkMan == newValue;
        });
        if (!contact.length) return;
        self.receiverIdentityCard(contact[0].IdCode);
        self.receiverCarNumber(contact[0].CarCode);
    });
    this.selectedCommodity.subscribe(function (newVal) {
        for (var i = 0, items = models.AllCommodities, len = items.length; i < len; i++) {
            if (items[i].id == newVal) {
                self.measureType(items[i].measureType);
                self.selectedUnit(items[i].unitId);
                self.brands.removeAll();
                self.brands(items[i].brands.slice());
                self.specifications.removeAll();
                self.specifications(items[i].specifications.slice());
                self.deliveryOrderCode('');
                break;
            }
        }
        _isCommodityChanged = true;
    });
    this.whStorageType.subscribe(function (newVal) {
        var list;
        self.spotOutDetails.removeAll();
        self.receiptOutDetails.removeAll();
        self.spotList.removeAll();
        self.receiptList.removeAll();
        self.selectedSpots.removeAll();
        self.selectedReceipts.removeAll();
        if (newVal == models.Enums.InventoryStorageType.Receipt) list = self.receiptList;
        else list = self.spotList;
        self.resetSlimCheck(list);
    });

    var _methods = {
        onPreAddOutDetail: function () {
            if (self.isPreDelivery()) {
                self.preDelivery.isEditing(false);
                self.preDelivery.clear();
                $('#addPreDeliveryDetailsModal').modal('show');
            } else {
                $('#addOutDetailsModal').modal('show');
            }
        },
        addOutDetail: function () {
            if (self.whStorageType() != models.Enums.InventoryStorageType.Receipt) {
                var isWeight = self.measureType() == models.Enums.CommodityMeasureType.ByWeight,
                    isNormalSpot = self.whStorageType() == models.Enums.InventoryStorageType.Spot;
                if (!self.selectedSpots().length) return alert('请先选择待发现货');
                $.each(self.selectedSpots(), function (i, spot) {
                    var detail;
                    if (isWeight && isNormalSpot) {
                        detail = {
                            CommodityId: spot.CommodityId,
                            BrandId: ko.observable(spot.BrandId),
                            SpecificationId: ko.observable(spot.SpecificationId),
                            Weight: ko.observable(spot.Weight()),
                            DeliveryBundles: ko.observable(spot.DeliveryBundles()),
                            PtlGrossWeight: ko.observable(spot.PtlGrossWeight()),
                            ActualWeight: ko.observable(spot.Weight()),
                            StorageCode: ko.observable(spot.StorageCode),
                            GroupCode: ko.observable(spot.GroupCode),
                            Spot: spot,
                            StorageCountInGroup: 1
                        };
                        _addToOutDetails(detail, self.spotOutDetails);

                        spot.Aailable(utils.round(new BigDecimal(spot.AailableWeight.toString()).subtract(new BigDecimal(spot.Weight().toString())).toString(), 4));
                        spot.AailableWeight = spot.AailableWeight - spot.Weight();
                    } else {
                        if (!isWeight && isNormalSpot) {
                            detail = {
                                CommodityId: spot.CommodityId,
                                BrandId: ko.observable(spot.BrandId),
                                SpecificationId: ko.observable(spot.SpecificationId),
                                Weight: ko.observable(spot.TotalAailableWeight()),
                                ActualWeight: ko.observable(spot.TotalAailableWeight()),
                                StorageCode: ko.observable(spot.StorageCode),
                                GroupCode: ko.observable(spot.GroupCode),
                                DeliveryBundles: ko.observable(spot.TotalBundles),
                                PtlGrossWeight: ko.observable(spot.TotalGrossWeight),
                                Spot: spot,
                                StorageCountInGroup: 1
                            };
                            self.spotList.remove(spot);
                            setTimeout(function () { spot.isSelected(false); }, 0);
                            _addToOutDetails(detail, self.spotOutDetails);
                        } else {
                            $.each(spot.StoragesWithInGroups, function (j, storageInGroup) {
                                detail = {
                                    CommodityId: storageInGroup.CommodityId,
                                    BrandId: ko.observable(storageInGroup.BrandId),
                                    SpecificationId: ko.observable(storageInGroup.SpecificationId),
                                    Weight: ko.observable(ko.utils.unwrapObservable(storageInGroup.TotalAailableWeight)),
                                    ActualWeight: ko.observable(ko.utils.unwrapObservable(storageInGroup.TotalAailableWeight)),
                                    StorageCode: ko.observable(storageInGroup.StorageCode),
                                    GroupCode: ko.observable(storageInGroup.GroupCode),
                                    DeliveryBundles: ko.observable(storageInGroup.TotalBundles),
                                    PtlGrossWeight: ko.observable(storageInGroup.TotalGrossWeight),
                                    Spot: storageInGroup,
                                    StorageCountInGroup: 0
                                };
                                if (j == 0) detail.StorageCountInGroup = spot.StoragesWithInGroups.length;
                                _addToOutDetails(detail, self.spotOutDetails);
                            });
                            self.spotList.remove(spot);
                            setTimeout(function () { spot.isSelected(false); }, 0);
                        }
                    }
                });
                if (!isWeight) self.resetSlimCheck();
                $('.weight-picker').val('');
                self.selectedSpots.removeAll();
            } else {
                if (!self.selectedReceipts().length) return alert('请先选择待发仓单');
                $.each(self.selectedReceipts(), function (i, receipt) {
                    _addToOutDetails({
                        CommodityId: receipt.CommodityId,
                        BrandId: receipt.BrandId,
                        SpecificationId: receipt.SpecificationId,
                        StorageCode: receipt.StorageCode,
                        GroupCode: receipt.GroupCode,
                        Weight: receipt.Weight,
                        WFWarehouseStorageId: receipt.WFWarehouseStorageId,
                        Receipt: receipt
                    }, self.receiptOutDetails);
                });
                self.receiptList.removeAll(self.selectedReceipts());
                self.selectedReceipts.removeAll();
                self.totalWeightForSelectedReceipts(0);
                self.resetSlimCheck();
            }
            utils.formatDecimal();
            $('#addOutDetailsModal').modal('hide');
        },
        //_preprocessSpots: function (spots) {
        //    if (!$.isArray(spots)) spots = [spots];
        //    $.each(spots, function (i, d) {
        //        if ((self.whStorageType() == models.Enums.InventoryStorageType.Spot)) {
        //            if (self.measureType() == models.Enums.CommodityMeasureType.ByWeight) {
        //                d.CardCode = d.StorageCode;
        //            } else {
        //                d.WeightMemoCode = d.StorageCode;
        //                d.CardCode = d.GroupCode;
        //            }
        //        } else {
        //            d.CardCode = d.GroupCode;
        //        }
        //    });
        //},
        //_preporcessReceipts: function (receipts) {
        //    if (!$.isArray(receipts)) receipts = [receipts];
        //    $.each(receipts, function (i, d) {
        //        if (models.isBohaiExchange(d.ExchangeId) || models.isWuxiExchange(d.ExchangeId)) {
        //            d.CardCode = d.StorageCode;
        //        } else {
        //            d.CardCode = d.GroupCode;
        //            d.WeightMemoCode = d.StorageCode;
        //        }
        //    });
        //},
        onSearch: function () {
            var query = utils.serialize("#searchSpotsForm .gmk-data-field", true);
            query.whStorageType = self.whStorageType();
            query.warehouseId = self.selectedWarehouse();
            query.ExchangeId = self.selectedExchangeId();
            query.commodityId = self.selectedCommodity();
            query.accountingEntityId = self.accountEntityId();
            query.IsAvailable = true;
            query.isGroup = true;
            query.isSaleOut = false;
            if (self.whStorageType() != models.Enums.InventoryStorageType.Receipt) {
                // 普通现货，海运单，仓库仓单
                base._get(options.searchSpotsUrl, query, function (data) {
                    //self._preprocessSpots(data);
                    self.fillSpotList(data);
                });
            } else {
                base._get(options.searchReceiptsUrl, query, function (data) {
                    //self._preporcessReceipts(data);
                    self.fillReceiptList(data);
                });
            }
        },
        fillSpotList: function (data) {
            $('.weight-picker').val('');
            self.selectedSpots.removeAll();
            self.spotList.removeAll();
            $.each(data, function (i, item) {
                item.IsSaleOut = ko.observable(false);
                item.TotalAailableWeight = ko.observable(item.TotalAailableWeight);
                item.Weight = ko.observable();
                item.Aailable = ko.observable(item.AailableWeight.toFixed(4));
                item.DeliveryBundles = ko.observable();
                item.PtlGrossWeight = ko.observable();
                item.Weight.subscribe(function (val) {
                    _onWeightChanged(val, item);
                });
                item.isSelected = ko.observable(false);
                item.isSelected.subscribe(function (newVal) {
                    _onSelectedChanged(newVal, item);
                });

                if (item.BrandId == null && item.StoragesWithInGroups.length > 0)
                    item.BrandId = item.StoragesWithInGroups[0].BrandId;
                if (item.SpecificationId == null && item.StoragesWithInGroups.length > 0)
                    item.SpecificationId = item.StoragesWithInGroups[0].SpecificationId;

                self.spotList.push(item);
            });
        },
        fillReceiptList: function (data) {
            self.receiptList.removeAll(self.selectedReceipts());
            self.selectedReceipts.removeAll();
            self.totalWeightForSelectedReceipts(0);
            self.receiptList.removeAll();
            $.each(data, function (i, item) {
                var included = false, details = self.receiptOutDetails();
                for (var i = 0; i < details.length; i++) {
                    if (details[i].Receipt.WFWarehouseStorageId == item.WFWarehouseStorageId) {
                        included = true;
                        break;
                    }
                }
                if (!included) {
                    item.isSelected = ko.observable(false);
                    item.isSelected.subscribe(function (val) { _onItemSelected(val, item, models.Enums.InventoryStorageType.Receipt); });
                    self.receiptList.push(item);
                }
            });
        },
        onGenerateDeliveryOrderCode: function () {
            base._post(options.generateDeliveryOrderCodeUrl, {
                commodityId: self.selectedCommodity(),
                warehouseId: self.selectedWarehouse(),
            }, function (result) {
                self.deliveryOrderCode(result.Data);
            });
        },
        startEditOutDetail: function (item) {
            currentEditingDetail = item;
            if (item.Spot) {
                self.currentOutDetail.copyFrom(item);
                $('#spotEditModal').modal('show');
            } else {
                self.preDelivery.isEditing(true);
                self.preDelivery.copyFrom(item);
                $('#addPreDeliveryDetailsModal').modal('show');
            }
            utils.formatDecimal();
        },
        completeEditOutDetail: function (item, event) {
            _editSpotOutDetail(event);
        },
        savePreDeliveryOutDetail: function (item, event) {
            if (self.preDelivery.isEditing()) {
                _editSpotOutDetail(event);
            } else {
                _addToOutDetails({
                    CommodityId: self.selectedCommodity(),
                    BrandId: ko.observable(self.preDelivery.BrandId()),
                    SpecificationId: ko.observable(self.preDelivery.SpecificationId()),
                    Weight: ko.observable(self.preDelivery.Weight()),
                    ActualWeight: ko.observable(null),
                    StorageCode: ko.observable(null),
                    GroupCode: ko.observable(null),
                    Spot: null,
                    StorageCountInGroup: 1,
                    DeliveryBundles: ko.observable(null),
                    PtlGrossWeight: ko.observable(null)
                }, self.spotOutDetails);
                $(event.currentTarget).closest('.modal').modal('hide');
                utils.formatDecimal();
            }
        },
        removeOutDetail: function (item) {
            if (self.whStorageType() != models.Enums.InventoryStorageType.Receipt) {
                if ((self.measureType() == models.Enums.CommodityMeasureType.ByWeight) && (self.whStorageType() == models.Enums.InventoryStorageType.Spot)) {
                    if (item.Spot && item.Spot.Weight && ko.isObservable(item.Spot.Weight)) {
                        item.Spot.Weight('');
                    }
                } else {
                    if (item.Spot && ko.isObservable(item.Spot.Weight)) self.spotList.push(item.Spot);
                    utils.autoFormatString();
                }
                self.spotOutDetails.splice(self.spotOutDetails.indexOf(item), item.StorageCountInGroup);
            } else if (self.whStorageType() == models.Enums.InventoryStorageType.Receipt) {
                if (item.Receipt) {
                    item.Receipt.isSelected(false);
                    self.receiptList.push(item.Receipt);
                }
                self.receiptOutDetails.remove(item);
                self.totalWeightForSelectedReceipts(0);
            }
        },
        isValid: function () {
            var result = $('#mainForm').valid(), temp, temp1;
            if (result) {
                if ((self.consignmentType() == models.Enums.SpotSendType.MakeReceipt) && (new Date(self.openBillTime()).valueOf() < requestDateForMakeReceipt.valueOf())) {
                    alert('开单日期必须晚于或等于制单日期' + moment(requestDateForMakeReceipt).format('YYYY-MM-DD'));
                    return false;
                }
                if (!self.isPreDelivery() && !root.isTemphold()) {
                    if ((self.consignmentType() == models.Enums.SpotSendType.ForContract)) {
                        if (self.whStorageType() == models.Enums.InventoryStorageType.Spot) {
                            $.each(self.spotOutDetails(), function (i, item) {
                                temp1 = item.Spot.Parent ? item.Spot.Parent.EntryTime : item.Spot.ActualEntryTime;
                                if (temp == null || temp < new Date(temp1)) temp = new Date(temp1);
                            });
                        } else if (self.whStorageType() == models.Enums.InventoryStorageType.Receipt) {
                            $.each(self.receiptOutDetails(), function (i, item) {
                                temp1 = item.Receipt.ActualEntryTime;
                                if (temp == null || temp < new Date(temp1)) temp = new Date(temp1);
                            });
                        }
                        if (temp && new Date(self.openBillTime()).valueOf() < temp.valueOf()) {
                            alert('开单日期必须晚于或等于所选库存的最晚入库日期' + moment(temp).format('YYYY-MM-DD'));
                            return false;
                        }
                    }
                }
                result = self.checkSave();
            }
            return result;
        },
        getOutRecordDescription: function () {
            var result = {
                OpenBillTime: self.openBillTime(),
                OutDate: self.outDate(),
                CommodityId: self.selectedCommodity(),
                UnitId: self.selectedUnit(),
                WarehouseId: self.selectedWarehouse(),
                ExchangeId: self.selectedExchangeId(),
                CustomerId: self.selectedCustomer(),
                Note: self.note(),
                OutType: self.outType(),
                ReceiverCarNumber: self.receiverCarNumber(),
                ReceiverName: self.receiverName(),
                ReceiverIdenityCard: self.receiverIdentityCard(),
                whStorageType: self.whStorageType()

            };
            result.WFWarehouseOutRecordId = options.id;
            if (result.whStorageType == models.Enums.InventoryStorageType.Spot) {
                result.DeliveryOrderCode = self.deliveryOrderCode();
            }
            return result;
        },
        getOutDetails: function () {
            var details;
            if (self.whStorageType() != models.Enums.InventoryStorageType.Receipt) {
                details = $.map(self.spotOutDetails(), function (item) {
                    item = $.extend({}, item);
                    if (item.Spot) {
                        item.WFWarehouseStorageId = item.Spot.WFWarehouseStorageId;
                        item.WeightMemoCode = item.Spot.WeightMemoCode;
                        item.GroupCode = item.Spot.GroupCode;
                        delete item.Spot;
                    } else {
                        item.WeightMemoCode = null;
                    }
                    return item;
                });
            } else {
                details = $.map(self.receiptOutDetails(), function (elem) {
                    var result = $.extend({}, elem);
                    elem.WeightMemoCode = elem.Receipt.WeightMemoCode;
                    delete result.Receipt;
                    return result;
                });
            }
            var result = ko.mapping.toJS(details);
            return result;
        },
        checkSave: function () {
            if (+self.whStorageType() === models.Enums.InventoryStorageType.Spot) {
                if (!self.spotOutDetails().length) {
                    alert('请选择至少一条现货并添加至发货明细');
                    return false;
                }
            } else if (+self.whStorageType() === models.Enums.InventoryStorageType.Receipt) {
                if (!self.receiptOutDetails().length) {
                    alert('请选择至少一个仓单并添加至发货明细');
                    return false;
                }
            } else {
                if (!self.spotOutDetails().length) {
                    alert('请添加一条发货明细');
                    return false;
                }
                var count = $.grep(self.spotOutDetails(), function (r) {
                    return r.StorageCountInGroup;
                }).length;
                if (count > 1) {
                    alert('只允许一条发货明细');
                    return false;
                }
            }
            return true;
        },
        initialize: function (options) {
            var details;
            if (options.id) {
                _isCommodityChanged = false;
                _isCustomerChanged = false;
                var isAGroup = (options.outRecord.WhStorageType == models.Enums.InventoryStorageType.BillOfLading) ||
                    (options.outRecord.WhStorageType == models.Enums.InventoryStorageType.WarehouseReceipt);
                self.whStorageType(options.outRecord.WhStorageType);
                self.deliveryOrderCode(options.outRecord.DeliveryOrderCode);
                self.selectedWarehouse(options.outRecord.WarehouseId);
                self.selectedExchangeId(options.outRecord.ExchangeId);
                self.accountEntityId(options.outRecord.AccountEntityId);
                self.selectedCustomer(options.outRecord.CustomerId);
                _isAssignCustomer = false;
                self.note(options.outRecord.Note);
                self.outType(options.outRecord.OutType);
                self.receiverName(options.outRecord.ReceiverName);
                self.receiverIdentityCard(options.outRecord.ReceiverIdenityCard);
                self.receiverCarNumber(options.outRecord.ReceiverCarNumber);
                self.openBillTime(options.outRecord.OpenBillTime);
                self.outDate(options.outRecord.OutDate);
                if (options.outRecord.SendType == models.Enums.SpotSendType.MakeReceipt) {
                    requestDateForMakeReceipt = new Date(options.association[0].RequestDate);
                }
                var isReceipt = options.outRecord.WhStorageType == models.Enums.InventoryStorageType.Receipt;
                $.each(options.outRecord.WFWarehouseOutRecordDetails, function (i, item) {
                    var storage = item.WFWarehouseStorage || {};
                    //if (isReceipt) self._preporcessReceipts(storage);
                    //else self._preprocessSpots(storage);
                    var result = {
                        CommodityId: storage.CommodityId,
                        BrandId: ko.observable(item.BrandId),
                        SpecificationId: ko.observable(item.SpecificationId),
                        Weight: ko.observable(item.Weight),
                        ActualWeight: ko.observable(item.ActualWeight),
                        DeliveryBundles: ko.observable(item.DeliveryBundles),
                        PtlGrossWeight: ko.observable(item.PtlGrossWeight),
                        StorageCode: ko.observable(storage.StorageCode),
                        GroupCode: ko.observable(storage.GroupCode),
                        WFContractOutRecordDetails: item.WFContractOutRecordDetails,
                        WFWarehouseOutRecordDetailId: item.WFWarehouseOutRecordDetailId,
                        StorageCountInGroup: 1
                    };
                    if (isAGroup) result.StorageCountInGroup = !i ? options.outRecord.WFWarehouseOutRecordDetails.length : 0;
                    if (options.outRecord.WhStorageType != models.Enums.InventoryStorageType.Receipt) {
                        result.Spot = item.WFWarehouseStorage;
                        if (self.measureType() == models.Enums.CommodityMeasureType.ByPiece) result.Spot.isSelected = ko.observable();
                    } else {
                        result.Receipt = item.WFWarehouseStorage;
                        result.Receipt.isSelected = ko.observable();
                        result.WFWarehouseStorageId = item.WFWarehouseStorageId;
                    }
                    if (options.outRecord.WhStorageType != models.Enums.InventoryStorageType.Receipt) details = self.spotOutDetails;
                    else details = self.receiptOutDetails;
                    _addToOutDetails(result, details);
                });
                utils.autoFormatString();
                _reloadContact();
                self.notifySubscribers(true);
            }
        },
        notifySubscribers: function (isSync) {
            if (isSync) PubSub.publishSync(OutDetailsChangeTopic, { outDetails: _getOutDetails() });
            else PubSub.publish(OutDetailsChangeTopic, { outDetails: _getOutDetails() });
        }
    };
    $.extend(this, _methods);

    function _addToOutDetails(item, collection) {
        var temp = item.WFContractOutRecordDetails;
        if (!temp || !temp.length) temp = [{}];
        $.each(temp, function (i, t) {
            $.each(['UnitId', 'StorageCode', 'GroupCode'], function (i, p) {
                t[p] = ko.utils.unwrapObservable(item[p]);
            });
            $.each(['Weight', 'ActualWeight'], function (i, p) {
                t[p] = ko.observable(t[p] || (temp.length == 1 ? ko.utils.unwrapObservable(item[p]) : null));
            });
            t.isHighlighted = ko.observable(self.isPreDelivery());
            t.isSelected = ko.observable(false);
            t.ContractDetailText = ko.observable();
            t.BrandId = ko.observable();
            t.SpecificationId = ko.observable();
            t.WeightMemoCode = null;
        });
        item.WFContractOutRecordDetails = ko.observable(temp);
        collection.push(item);
    }
    function _onWeightChanged(val, d) {
        var changedWeight = Number(val || '0');
        if (isNaN(changedWeight)) {
            changedWeight = 0;
            alert("出库重量不是合法的数字");
        }
        if (val && self.selectedSpots.indexOf(d) == -1) { self.selectedSpots.push(d); }
        if (!val && self.selectedSpots.indexOf(d) > -1) { self.selectedSpots.remove(d); }
        d.Aailable(utils.round(new BigDecimal(d.AailableWeight.toString()).subtract(new BigDecimal(changedWeight.toString())).toString(), 4));
    }
    function _onSelectedChanged(newVal, d) {
        var index = self.selectedSpots.indexOf(d);
        if (!newVal && index != -1) self.selectedSpots.remove(d);
        if (newVal && index == -1) self.selectedSpots.push(d);
    }
    function _onItemSelected(val, item, whStorageType) {
        if (whStorageType != models.Enums.InventoryStorageType.Receipt) {
            // nothing to do here
        } else {
            if (val) {
                self.selectedReceipts.push(item);
                self.totalWeightForSelectedReceipts(utils.parseFloat(self.totalWeightForSelectedReceipts()) + utils.parseFloat(item.Weight));
            } else {
                self.selectedReceipts.remove(item);
                self.totalWeightForSelectedReceipts(utils.parseFloat(self.totalWeightForSelectedReceipts()) - utils.parseFloat(item.Weight));
            }
        }
    }
    function _editSpotOutDetail(e) {
        $(e.currentTarget).closest('.modal').modal('hide');
        if (currentEditingDetail.Spot) {
            currentEditingDetail.ActualWeight(self.currentOutDetail.ActualWeight());
            currentEditingDetail.Weight(self.currentOutDetail.Weight());
            currentEditingDetail.DeliveryBundles(self.currentOutDetail.DeliveryBundles());
            currentEditingDetail.PtlGrossWeight(self.currentOutDetail.PtlGrossWeight());
            if (currentEditingDetail.WFContractOutRecordDetails().length == 1) {
                currentEditingDetail.WFContractOutRecordDetails()[0].Weight(self.currentOutDetail.Weight());
                currentEditingDetail.WFContractOutRecordDetails()[0].ActualWeight(self.currentOutDetail.ActualWeight());
            }
        } else {
            self.preDelivery.isEditing(false);
            self.preDelivery.copyTo(currentEditingDetail);
            self.preDelivery.clear();
        }
        currentEditingDetail = null;
        utils.formatDecimal();
    }
    function _getOutDetails() {
        var details = [];
        if (self.whStorageType() != models.Enums.InventoryStorageType.Receipt) details = self.spotOutDetails();
        else details = self.receiptOutDetails();
        return ko.utils.unwrapObservable(details);
    }
    function _reloadContact() {
        if (!_isCommodityChanged && !_isCustomerChanged) return;
        base._get(options.listContactsUrl, {
            //companyId: self.selectedCustomer(),
            commodityId: self.selectedCommodity()
        }, function (result) {
            self.contacts(result.Data.list);
        });
    }

    PubSub.subscribe(BasicSettingChangeTopic, function (msg, data) {
        _isCommodityChanged = false;
        _isCustomerChanged = false;
        self.accountEntityId(data.extraInfo.accountEntityId || self.accountEntityId());
        self.whStorageType(data.extraInfo.whStorageType);
        self.consignmentType(parseInt(data.consignmentType, 10));
        self.isPreDelivery(data.extraInfo.isPreDelivery);
        self.selectedCommodity(data.extraInfo.selectedCommodity);
        if (+data.extraInfo.whStorageType !== models.Enums.InventoryStorageType.Receipt) {
            self.selectedExchangeId(null);
        } else if (+data.consignmentType !== models.Enums.SpotSendType.ForContract) {
            self.selectedExchangeId(data.extraInfo.storageConversionExchangeId);
        }

        if (_isAssignCustomer) {
            if (data.extraInfo.selectedCustomer === '') {
            } else {
                self.selectedCustomer(data.extraInfo.selectedCustomer || window.corporationId);
            }
            if (data.extraInfo.selectedWarehouse) { self.selectedWarehouse(data.extraInfo.selectedWarehouse); }
            if (data.extraInfo.selectedContracts && data.extraInfo.selectedContracts.length) {
                self.preDelivery.presetBrandId = data.extraInfo.selectedContracts[0].data.WFContractDetailInfoes[0].BrandId;
                self.preDelivery.presetSpecificationId = data.extraInfo.selectedContracts[0].data.WFContractDetailInfoes[0].SpecificationId;
                $('#BrandId').val(self.preDelivery.presetBrandId).change();
                $('#SpecificationId').val(self.preDelivery.presetSpecificationId).change();
            }
            if (data.extraInfo.selectedBrand) { $('#BrandId').val(data.extraInfo.selectedBrand).change(); }
            if (data.extraInfo.requestDateForMakeReceipt) { requestDateForMakeReceipt = data.extraInfo.requestDateForMakeReceipt; }
        }
        _reloadContact();
    });
    PubSub.subscribe(OnInitializeTopic, function (msg, data) {
        self.initialize(data);
    });
}

function PreDeliveryViewModel(data) {
    this.presetBrandId = null;
    this.presetSpecificationId = null;
    this.BrandId = ko.observable();
    this.SpecificationId = ko.observable();
    this.Weight = ko.observable();
    this.isEditing = ko.observable(false);

    var self = this,
        mappingProperties = {
            include: ['BrandId', 'SpecificationId', 'Weight']
        };
    var _methods = {
        copyTo: function (target) {
            target.BrandId(self.BrandId());
            target.SpecificationId(self.SpecificationId());
            target.Weight(self.Weight());
            if (target.WFContractOutRecordDetails().length == 1) {
                target.WFContractOutRecordDetails()[0].Weight(self.Weight());
            }
        },
        copyFrom: function (obj) {
            ko.mapping.fromJS(ko.mapping.toJS(obj), mappingProperties, self);
        },
        clear: function () {
            self.BrandId(self.presetBrandId);
            self.SpecificationId(self.presetSpecificationId);
            self.SpecificationId('');
            self.Weight('');
        }
    };
    $.extend(this, _methods);
    if (data && $.isPlainObject(data)) this.copyFrom(data);
}

function LinkToContractViewModel(models) {
    var self = this;
    this.visible = ko.observable(true);
    this.whStorageType = ko.observable();
    this.isPreDelivery = ko.observable();
    this.measureType = ko.observable();
    this.selectedCommodity = ko.observable();
    this.contractDetails = ko.observableArray();
    this.outDetails = ko.observableArray();
    this.outDetailsCordsSelected = ko.computed(function () {
        return $.grep($.map(self.outDetails(), function (r) {
            return r.WFContractOutRecordDetails();
        }), function (r) {
            return r.isSelected();
        });
    });
    this.assignments = ko.observableArray();
    this.splitOutDetailsViewModel = new SplitOutDetailsViewModel();
    var _editingGroup = null;

    this.whStorageType.subscribe(function () {
        self.outDetails.removeAll();
        //self.resetSlimCheck();
    });
    this.selectedCommodity.subscribe(function (newVal) {
        for (var i = 0, items = models.AllCommodities, len = items.length; i < len; i++) {
            if (items[i].id == newVal) {
                self.measureType(items[i].measureType);
                break;
            }
        }
    });

    var _methods = {
        preSplitOutDetail: function (item) {
            return function () {
                _editingGroup = item;
                self.splitOutDetailsViewModel.totalWeight(item.Weight() || 0);
                self.splitOutDetailsViewModel.totalActualWeight(item.ActualWeight() || 0);
                self.splitOutDetailsViewModel.initialize($.map(item.WFContractOutRecordDetails(), function (term) {
                    return new SplitOutDetailViewModel(term.ContractDetailText(), term.ObjectId, null, null,
                        term.ActualWeight(), term.Weight(), term.WFContractOutRecordDetailId);
                }), item.WFContractOutRecordDetails()[0], ko.mapping.toJS(self.contractDetails));
            };
        },
        saveSplitOutDetail: function (item, event) {
            if (!self.splitOutDetailsViewModel.isValid()) {
                return alert('请确保总单据重量和总结算重量在拆分前后一致');
            }
            var template = self.splitOutDetailsViewModel.splittingItem, collection = self.splitOutDetailsViewModel.getList();
            self.splitOutDetailsViewModel.addingItem.reset();
            var newOnes = $.map(collection, function (elem) {
                var contractDetail = elem.ObjectId ? $.grep(self.contractDetails(), function (cd) {
                    return cd.Data.WFContractDetailInfoId == elem.ObjectId;
                })[0].Data : {};
                var result = $.extend({}, template, {
                    isSelected: ko.observable(),
                    ContractDetailText: ko.observable(elem.ObjectId ? elem.ContractDetailText : ''),
                    ObjectId: elem.ObjectId || null,
                    BrandId: ko.observable(contractDetail.BrandId),
                    SpecificationId: ko.observable(contractDetail.SpecificationId),
                    ActualWeight: ko.observable(elem.ActualWeight || null),
                    Weight: ko.observable(elem.Weight || null)
                });
                //新增的明细需要newid
                if (elem.WFContractOutRecordDetailId) result.WFContractOutRecordDetailId = elem.WFContractOutRecordDetailId;
                else result.WFContractOutRecordDetailId = null;
                return result;
            });
            if (_editingGroup) _editingGroup.WFContractOutRecordDetails(newOnes);
            _editingGroup = null;
            $(event.currentTarget).closest('.modal').modal('hide');
            utils.formatDecimal();
        },
        assignContractDetail: function (item) {
            var isReset = (!item.Data || !item.Data.WFContractDetailInfoId);
            $.each(self.outDetails(), function (i, od) {
                $.each(od.WFContractOutRecordDetails(), function (i2, elem) {
                    if (!elem.isSelected()) return;
                    if (!isReset) {
                        elem.ContractDetailText(item.DisplayText);
                        elem.ObjectId = item.Data.WFContractDetailInfoId;
                        elem.BrandId(item.Data.BrandId);
                        elem.SpecificationId(item.Data.SpecificationId);
                    } else {
                        elem.ContractDetailText('');
                        elem.ObjectId = null;
                        elem.BrandId(null);
                        elem.SpecificationId(null);
                    }
                    elem.isSelected(false);
                });
            });
        },
        checkSave: function () {
            var result = true, isAllAssigned = true, weightIsMatched = true, msg = '',
                weight1 = 0, weight2 = 0, index = 1;
            $.each(self.outDetails(), function (i, od) {
                $.each(od.WFContractOutRecordDetails(), function (j, item) {
                    if (!item.ObjectId) isAllAssigned = false;
                    weight1 = weight1 + utils.parseFloat(item.Weight());
                    weight2 = weight2 + utils.parseFloat(item.ActualWeight());
                });
                // 如果为仓库仓单时，不需要填写actualWeight，所以其值为空
                weightIsMatched = weightIsMatched && ((Math.abs(weight1 - ko.utils.unwrapObservable(od.Weight)) < Math.Epsilon) && (Math.abs(weight2 - (ko.utils.unwrapObservable(od.ActualWeight) || 0)) < Math.Epsilon));
                weight1 = 0;
                weight2 = 0;
            });

            if (!isAllAssigned) {
                msg = msg + index + '. 请确保发货记录已经全部被分配给合同明细';
                index++;
            }
            if (!weightIsMatched) {
                if (index > 1) msg = msg + '\r\n';
                msg = msg + index + '. 请确保拆分后重量和发货明细匹配';
                result = false;
            }
            if (msg) {
                alert(msg);
                result = false;
            }
            return result;
        },
        onDisplaySummary: function () {
            self.assignments.removeAll();
            var mapping = {}, data = [];
            $.each(self.contractDetails(), function (i, elem) {
                mapping[elem.Data.WFContractDetailInfoId] = {
                    ContractDetailText: elem.DisplayText,
                    TotalWeight: 0,
                    TotalActualWeight: 0,
                    assignmentDetails: []
                };
            });
            $.each(self.outDetails(), function (i1, word) {
                $.each(word.WFContractOutRecordDetails(), function (i2, cord) {
                    if (cord.ObjectId) {
                        var temp = mapping[cord.ObjectId];
                        temp.assignmentDetails.push({
                            word: word,
                            cord: cord
                        });
                        temp.TotalWeight += (+cord.Weight() || 0);
                        temp.TotalActualWeight += (+cord.ActualWeight() || 0);
                    }
                });
            });
            for (var prop in mapping) {
                if (mapping.hasOwnProperty(prop)) {
                    data.push(mapping[prop]);
                }
            }
            self.assignments(data);
            utils.formatDecimal();
        }
    };
    $.extend(this, _methods);

    PubSub.subscribe(BasicSettingChangeTopic, function (msg, data) {
        self.whStorageType(data.extraInfo.whStorageType);
        self.isPreDelivery(data.extraInfo.isPreDelivery);
        self.selectedCommodity(data.extraInfo.selectedCommodity);
        self.contractDetails.removeAll();
        var details = [];
        // if it comes here, selectedContracts shouldn't be null;
        // but if selectedContracts is actually null, then clear the contract details and filled-in linked info for robustness
        $.each(data.extraInfo.selectedContracts || [], function (i, item) {
            $.each(item.data.WFContractDetailInfoes, function (j, elem) {
                details.push({
                    DisplayText: '{0}-{1}-{2}-{3}-{4}-{5}'.format(item.code, models.findBrand(elem.BrandId, item.data.CommodityId),
                        models.findSpecification(elem.SpecificationId, item.data.CommodityId), elem.Weight, elem.ActualPrice || elem.Price, elem.DeliveryAddress),
                    Data: elem
                });
            });
        });
        self.contractDetails(details);

        $.each(self.outDetails(), function (i, od) {
            $.each(od.WFContractOutRecordDetails(), function (j, term) {
                if (!$.grep(details, function (detail) {
                    return detail.Data.WFContractDetailInfoId == term.ObjectId;
                }).length) {
                    term.ObjectId = null;
                    term.ContractDetailText('');
                }
            });
        });
    });
    PubSub.subscribe(OutDetailsChangeTopic, function (msg, data) {
        self.outDetails(data.outDetails);
        $.each(self.outDetails(), function (i, outDetail) {
            $.each(outDetail.WFContractOutRecordDetails(), function (j, contractOutDetail) {
                var contractDetail = $.grep(self.contractDetails(), function (cd) {
                    return cd.Data.WFContractDetailInfoId == contractOutDetail.ObjectId;
                })[0];
                if (!contractDetail) return;
                contractOutDetail.ContractDetailText(contractDetail.DisplayText);
                contractOutDetail.BrandId(contractDetail.Data.BrandId);
                contractOutDetail.SpecificationId(contractDetail.Data.SpecificationId);
            });
        });
        utils.formatDecimal();
    });
}

function ConfirmSaveViewModel() {
    var self = this;
    var _cancelCallback = null;
    var _submitCallback = null;

    this.message = ko.observable();
    this.isContinueSubmit = ko.observable();
    var _methods = {
        isBack: false,
        onShow: function () {
            $('#confirmFinishOutModal').modal('show');
        },
        onHide: function () {
            $('#confirmFinishOutModal').modal('hide');
        },
        onCancel: function () {
            self.onHide();
            if (_cancelCallback) _cancelCallback();
            if (self.isBack) setTimeout(function () { History.back(); }, 0);
        },
        cancelCallback: function (callback) {
            _cancelCallback = callback;
        },
        submitCallback: function (callback) {
            _submitCallback = callback;
        },
        onSubmit: function () {
            if (_submitCallback) _submitCallback();
        }
    };
    $.extend(this, _methods);
}
