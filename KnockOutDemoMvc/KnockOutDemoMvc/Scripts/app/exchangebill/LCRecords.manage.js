/**
* create by amy
* create date 2015-08-21
*/
"use strict";
var ns = utils.namespace('GMK.ExchangBill.LCRecords');

ns.start = function (data) {
    var baseUrl = 'ExchangeBill/';

    GMK.Features.CommonModels.onReady(function (models) {
        var viewModel;
        viewModel = new ns.ManageViewModel(models, data, {
            loadContractUrl: baseUrl + 'GetContracts',
            loadLCUrl: baseUrl + 'GetLC',
            saveUrl: baseUrl + 'SaveLC',
            searchContractUrl: baseUrl + 'SearchContractForLC',
        });
        viewModel.initialize(data);
        viewModel.commonModels.registerQueryFormEvent();
        ko.applyBindings(viewModel);
    });
};

var OnInitalizeContract = "initContract";
ns.ManageViewModel = function (models, values, options) {
    var self = this;
    var base = GMK.Features.FeatureBase;
    self.commonModels = models;
    self.isCreate = !values.lcId;

    self.item = ko.mapping.fromJS(values.data);
    self.loadFromContract = ko.observable(false);

    self.selectContractViewModel = new ns.SelectContractViewModel(models, options);

    self.allCustomers = models._AllCustomers.slice().concat(models._AllBanks.slice()).concat(models._AllCorporations.slice());

    self.invalids = {
        lcInvalids: ko.observable(0)
    };
    self.customShowErrors = ko.observable();
    utils.setCustomShowErrors(self.customShowErrors);
    self.setCustomShowErrors = {
        lcInvalids: function () { self.customShowErrors(self.invalids.lcInvalids); }
    };

    //self.item.isPay.subscribe(function (newVal) {
    //    if (newVal == true) {
    //        if (self.item.beneficiaryId() == window.corporationId)
    //            self.item.beneficiaryId(null);
    //        if (!self.item.applicantId())
    //            self.item.applicantId(window.corporationId);
    //    } else {
    //        if (!self.item.beneficiaryId())
    //            self.item.beneficiaryId(window.corporationId);
    //        if (self.item.applicantId() == window.corporationId)
    //            self.item.applicantId(null);
    //    }
    //});

    self.item.positiveFloatingAmountRatio.subscribe(function (newVal) {
        if (newVal && !isNaN(newVal)) {
            self.item.negativeFloatingAmountRatio(newVal);
        }
    });

    //即期远期判断
    self.isUsance = ko.computed(function () {
        var type = self.item.isSight();
        if ((type + '').toLowerCase() == "false")
            return true;
        else
            return false;
    });
    self.accountingEntities = ko.computed(function () {
        var commodity = $.grep(models.AllCommodities, function (r) {
            return self.item.commodityId() === r.id;
        });
        if (commodity.length > 0)
            return commodity[0].accountingEntities.slice();
        else
            return [];
    });
    self.editableWithContract = ko.computed(function () {
        if (self.selectContractViewModel.selectedContracts().length > 0)
            return false;
        else
            return true;
    });
    PubSub.subscribe(OnInitalizeContract, function (msg, data) {
        var contract = data.contract;
        var settleOption = contract.wfSettleOption;
        var lcType = models.Enums.ExchangeProcessType;
        self.item.commodityId(contract.commodityId);
        self.item.customerId(contract.customerId);
        self.item.currencyId(contract.currencyId);
        self.item.isPay(contract.isBuy);
        //if (contract.isBuy) {
        //    self.item.beneficiaryId(contract.customerId);
        //    self.item.applicantId(contract.corporationId);
        //} else {
        //    self.item.beneficiaryId(contract.corporationId);
        //    self.item.applicantId(contract.customerId);
        //}
        if (settleOption && settleOption.wfSettleOptionDetails.length > 0) {
            var defaultLcData = settleOption.wfSettleOptionDetails[0].wfSettleOptionDetailExchangeProcess ?
                settleOption.wfSettleOptionDetails[0].wfSettleOptionDetailExchangeProcess.wfSodEpLetterOfCredit : null;
            var defaultEpData = settleOption.wfSettleOptionDetails[0].wfSettleOptionDetailPaymentForm ?
                settleOption.wfSettleOptionDetails[0].wfSettleOptionDetailPaymentForm.wfSodPfExchangeBill : null;
            if (defaultLcData) {
                self.item.issuingBankId(defaultLcData.notificationId);
                self.item.advisingBankId(defaultLcData.licensingBankId);
                self.item.isSight(((defaultLcData.termType == models.Enums.TermType.Sight) + '').toLowerCase());
                self.item.amount(defaultLcData.amount);
                if (defaultEpData) {
                    self.item.discountDays(defaultEpData.discountDays);
                    self.item.discountRate(defaultEpData.discountRate);
                    self.item.floatingInterestRateType(defaultEpData.floatInterestType);
                }
            }
        }
    });

    var _methods = {
        initialize: function (data) {
            if (!self.isCreate) {
                self.loadLC();
            } else {
                self.item.isSight('false');
                self.item.isPay(false);
                self.item.corporationId(window.corporationId);
                if (data.contractId)
                    self.loadContract();
            }
        },
        loadContract: function () { //根据合同信息加载
            self.selectContractViewModel.initFromData([values.contractId], true);
            self.loadFromContract(true);
        },
        loadLC: function () {
            base._get(options.loadLCUrl, { id: values.lcId }, function (result) {
                var data = result.data.item;
                self.fromJS(data);
                self.item.isSight((data.isSight + '').toLowerCase());
                self.item.negativeFloatingAmountRatio(data.negativeFloatingAmountRatio);
                self.item.applicantId(data.applicantId === 0 ? null : data.applicantId);
                self.item.beneficiaryId(data.beneficiaryId === 0 ? null : data.beneficiaryId);
                self.item.issuingBankId(data.issuingBankId === 0 ? null : data.issuingBankId);
                self.item.advisingBankId(data.advisingBankId === 0 ? null : data.advisingBankId);
            });
        },
        toJS: function () {
            var data = ko.mapping.toJS(self.item);
            var lcContracts = data.wfLcContracts.slice();
            data.wfLcContracts = [];
            var selectedList = self.selectContractViewModel.selectedContracts();
            $.each(selectedList, function (i, item) {
                var haveContracts = $.grep(lcContracts, function (r) {
                    return r.wfContractInfoId == item.wfContractInfoId;
                });
                if (!(haveContracts.length > 0)) { //如果现有的选择的合同没有在已有的列表里面
                    data.wfLcContracts.push({
                        wfContractInfoId: item.wfContractInfoId,
                        wfLetterOfCreditId: data.wfLetterOfCreditId,
                    });
                } else {
                    data.wfLcContracts.push(haveContracts[0]);
                }
            });
            return data;
        },
        fromJS: function (data) {
            ko.mapping.fromJS(data, self.item);
            if (data.wfLcContracts && data.wfLcContracts.length > 0) {
                var contractIds = $.map(data.wfLcContracts, function (r) {
                    return r.wfContractInfoId;
                });
                //编辑时不需要重置基本信息
                self.selectContractViewModel.initFromData(contractIds, false);
            }
        },
        onSave: function () {
            var param = self.toJS();
            base._post(options.saveUrl, param, function (result) {
                base._back();
            });
        }
    };

    $.extend(this, _methods);
};

//合同选择viewModel
ns.SelectContractViewModel = function (models, options) {
    var self = this;
    var base = GMK.Features.FeatureBase;
    self.query = {
        customerId: ko.observable(),
        commodityId: ko.observable(),
        accountEntityId: ko.observable(),
        contractCodeContains: ko.observable(),
        exchangeProcessType: models.Enums.ExchangeProcessType.LetterOfCredit,
        isBuy: ko.observable(false),
    };
    self.contractList = ko.observableArray([]);
    self.selectedContracts = ko.observableArray([]);
    self.queryDisable = ko.observable(false);

    self.accountingEntities = ko.computed(function () {
        var commodity = $.grep(models.AllCommodities, function (r) {
            return self.query.commodityId() === r.id;
        });
        if (commodity.length > 0)
            return commodity[0].accountingEntities.slice();
        else
            return [];
    });

    var _methods = {
        onSearch: function () {
            var param = ko.mapping.toJS(self.query);
            var selected = ko.mapping.toJS(self.selectedContracts);
            base._get(options.searchContractUrl, param, function (result) {
                var list = result.data.list;
                $.each(list, function (i, item) {
                    var isSelected = $.grep(selected, function (r) {
                        return r.wfContractInfoId == item.wfContractInfoId;
                    });
                    if (isSelected.length > 0)
                        item.isSelected = true;
                    else
                        item.isSelected = false;
                });
                self.contractList(list);
            });
        },
        onPreSelect: function () {
            if (self.selectedContracts().length == 0)
                self.queryDisable(false);
            else {
                var contract = self.selectedContracts()[0];
                self.query.customerId(contract.customerId);
                self.query.commodityId(contract.commodityId);
                self.query.accountEntityId(contract.accountingEntityId);
                self.query.isBuy(contract.isBuy);
                self.queryDisable(true);
            }
            self.contractList.removeAll();
            return true;
        },
        onSelect: function () {
            var list = $.grep(self.contractList(), function (r) {
                return r.isSelected;
            });
            if (list.length > 0)
                self.queryDisable(true);
            if (self.selectedContracts().length == 0 && list.length > 0) {
                //默认取第一次选择的第一个合同的信息作为默认信息
                PubSub.publish(OnInitalizeContract, {
                    contract: list[0]
                });
            }
            self.selectedContracts(list);
            return true;
        },
        onCancel: function () { return true; },
        onRemove: function (item) {
            $.each(self.contractList(), function (i, detail) {
                if (detail.wfContractInfoId == item.wfContractInfoId)
                    detail.isSelected = false;
            });
            self.selectedContracts.remove(item);
        },
        initFromData: function (ids, needPublish) {
            base._get(options.loadContractUrl + '?' + $.param({ contractIds: ids }, true), null, function (result) {
                var list = result.data.list;
                self.selectedContracts($.extend(list, { isSelected: true }));
                if (needPublish) {
                    PubSub.publish(OnInitalizeContract, {
                        contract: list[0]
                    });
                }
            });
        },
    };
    $.extend(this, _methods);
}