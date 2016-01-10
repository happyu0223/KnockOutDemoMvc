/**
 * Created with JetBrains WebStorm.
 * User: dawson.liu
 * Date: 13-9-5
 * Time: 上午10:10
 * To change this template use File | Settings | File Templates.
 */

var GMK = GMK || {};
GMK.Settlement = GMK.Settlement || {};
GMK.Settlement.ReceivingRecords = GMK.Settlement.ReceivingRecords || {};

GMK.Settlement.ReceivingRecords.start = function (route, element, success) {
    var $routeElem = $("#gmk-route"), param = {
        baseUrl: 'Settlement/',
        action: (route || {}).action || $routeElem.data("action"),
    };
    GMK.Features.CommonModels.onReady(function (models) {
        if (param.action == 'Manage') {
            var viewModel = new GMK.Settlement.ReceivingRecords.ManageViewModel(models, route, {
                loadUrl: 'Settlement/GetReceivingRecord',
                searchContractUrl: 'Settlement/GetContracts',
                searchCommercialInvoiceUrl: 'Settlement/ListCommercialInvoices',
                searchFirePriceRecordsUrl: 'Settlement/ListFirePriceRecords',
                saveUrl: 'Settlement/SaveReceivingRecord',
                listUrl: 'Settlement/ReceivingRecords',
                searchBillUrl: 'Settlement/SearchBills',
            });
            models.registerQueryFormEvent('.collapse-query');
            viewModel.initialize(function () {
                ko.applyBindings(viewModel, element);
                if (success) {
                    success(viewModel);
                }
                if (viewModel.isCreate && !viewModel.item.CompanyBankInfoId()) {
                    $.each(viewModel.selectedCorporationAccounts(), function (i, r) {
                        if (r.type == models.Enums.BankType.RemittingtBank) {
                            viewModel.item.CompanyBankInfoId(r.id);
                            return false;
                        }
                    });
                }
            });
        } else if (param.action === 'Index') {
            var viewModel = new GMK.Settlement.ReceivingRecords.ListViewModel(models, route, {
                searchUrl: param.baseUrl + 'ListReceivingRecords?',
                deleteUrl: param.baseUrl + 'DeleteReceivingRecord',
                editUrl: route.values.editUrl
            });
            models.registerQueryFormEvent();
            viewModel.initialize(function () {
                ko.applyBindings(viewModel, element);
                if (success) {
                    success(viewModel);
                }
            });
        }
    });
};

GMK.Settlement.ReceivingRecords.ListViewModel = function (models, route, options) {
    var self = $.extend(this, new GMK.Features.CommonListViewModel({
        route: route,
        searchUrl: options.searchUrl,
        deleteUrl: options.deleteUrl,
        pagerElem: '#pager',
        getPageSummary: function (items) {
            return items.reduce(function (m, r) {
                m.ActualCurrencyFutureValue = utils.roundAmount(m.ActualCurrencyFutureValue + utils.roundAmount(r.ActualCurrencyFutureValue));
                if (m.ActualCurrencyIds.indexOf(r.ActualCurrencyId) === -1) {
                    m.ActualCurrencyIds.push(r.ActualCurrencyId);
                }
                return m;
            }, {
                ActualCurrencyFutureValue: 0,
                ActualCurrencyIds: []
            });
            //var summary = {
            //    Amount: 0,
            //};
            //$.each(items, function (i, r) {
            //    summary.Amount = utils.roundAmount(summary.Amount + utils.roundAmount(r.Amount));
            //});
            //return summary;
        },
        getDeleteParam: function (item) {
            return { id: item.WFAmountRecordId };
        }
    }));
    self.commonModels = models;
    var base = GMK.Features.FeatureBase;
    var getAmountDetailObjectTypes = function (payPurposeType, tradeType) {
        tradeType = tradeType || models.Enums.FullTradeType.DomesticOrForeign;
        return $.map($.grep(models.EnumRelations.Amount, function (r) {
            return r.PayPurposeType === payPurposeType && (r.TradeType & tradeType) !== 0;
        }), function (r) {
            return r.AmountDetailObjectType;
        });
    };
    self.ptquery = new (function () {
        this.PayPurposeTypeOptions = $.grep(models.EnumOptions.PayPurposeType, function (r) {
            return $.inArray(r.value, [models.Enums.PayPurposeType.MainTrade, models.Enums.PayPurposeType.FirePriceMargin]) !== -1;
        });
        this.availableAmountDetailObjectTypeOptions = ko.computed(function () {
            var types = getAmountDetailObjectTypes(self.toquery.PayPurposeType(), window.GMK.Context.TradeType);
            return $.grep(models.EnumOptions.AmountDetailObjectType, function (r) {
                return $.inArray(r.value, types) !== -1;
            });
        });
    })();

    self.onEdit = function (item, event) {
        location.href = options.editUrl + '?' + $.param({ id: item.WFAmountRecordId });
    };
}

GMK.Settlement.ReceivingRecords.ManageViewModel = function (models, route, options) {
    var self = this;
    var vm = this;
    self.commonModels = models;
    self.values = route.values;
    var base = GMK.Features.FeatureBase;
    self.item = ko.mapping.fromJS(route.values.newItem);

    self.isCreate = route.values.isCreate;
    self.isEdit = !self.isCreate;
    self.isFromContract = !!route.values.contractId;
    self.isForContractFromBalace = !!route.values.balanceSettlementId;
    self.isFromInvoice = !!route.values.invoiceRecordId;
    self.isForInvoiceFromContract = !!route.values.contractIdForInvoice;
    self.isFromFirePrice = !!(route.values.firePriceRecordIds && route.values.firePriceRecordIds.length);

    self.amountRecord = ko.observable();
    self.canUserEditAmount = ko.computed(function () {
        return !(self.isForContractFromBalace || self.amountRecord() && self.amountRecord().Record.WFSettlementRequestId);
    });

    var getAmountDetailObjectTypes = function (payPurposeType, tradeType) {
        tradeType = tradeType || models.Enums.FullTradeType.DomesticOrForeign;
        return $.map($.grep(models.EnumRelations.Amount, function (r) {
            return r.PayPurposeType === payPurposeType && (r.TradeType & tradeType) !== 0;
        }), function (r) {
            return r.AmountDetailObjectType;
        });
    };
    //var getPayPurposeType = function (amountDetailObjectType) {
    //    return $.map($.grep(models.EnumRelations.Amount, function (r) {
    //        return r.AmountDetailObjectType === amountDetailObjectType;
    //    }), function (r) {
    //        return r.PayPurposeType;
    //    })[0];
    //};
    self.availableAmountDetailObjectTypeOptions = ko.computed(function () {
        var types = getAmountDetailObjectTypes(self.item.PayPurposeType(), window.GMK.Context.TradeType);
        return $.grep(models.EnumOptions.AmountDetailObjectType, function (r) {
            return $.inArray(r.value, types) !== -1;
        });
    });
    self.item.PayPurposeType.subscribe(function (newVal) {
        if (newVal != models.Enums.PayPurposeType.FirePriceMargin) {
            self.item.MarginReturned(null);
            self.item.MarginAsPayment(null);
        }
    });
    self.PayPurposeTypeOptions = $.grep(models.EnumOptions.PayPurposeType, function (r) {
        return $.inArray(r.value, [models.Enums.PayPurposeType.MainTrade, models.Enums.PayPurposeType.FirePriceMargin]) !== -1;
    });

    self.selectedContracts = ko.observableArray();
    self.selectedCommercialInvoices = ko.observableArray();
    self.selectedFirePriceRecords = ko.observableArray();
    self.associations = ko.computed(function () {
        switch (+self.item.DetailObjectType()) {
            case models.Enums.AmountDetailObjectType.Contract:
                return self.selectedContracts();
            case models.Enums.AmountDetailObjectType.CommercialInvoice:
                return self.selectedCommercialInvoices();
            case models.Enums.AmountDetailObjectType.FirePriceRecord:
                return self.selectedFirePriceRecords();
            case models.Enums.AmountDetailObjectType.WarehouseFee:
            case models.Enums.AmountDetailObjectType.LogisticsFee:
            default:
                return [];
        }
    });
    self.selectedCommodity = ko.computed(function () {
        return utils.find(models.AllCommodities, function (r) {
            return r.id === self.item.CommodityId();
        });
    });
    self.availablePairs = ko.computed(function () {
        return $.grep(models.AllCurrencyPairs, function (r) {
            return self.item.ActualCurrencyId() === r.baseCurrencyId && self.item.CurrencyId() === r.counterCurrencyId ||
                self.item.ActualCurrencyId() === r.counterCurrencyId && self.item.CurrencyId() === r.baseCurrencyId;
        });
    });
    self.currencyPair = ko.computed(function () {
        var pairId = self.item.PtlExchangeRate.WFCurrencyPairId();
        return utils.find(models.AllCurrencyPairs, function (r) {
            return r.id === pairId;
        });
    });
    self.exchangeRateDirection = ko.computed(function () {
        if (self.item.ExchangeRateId() !== self.item.PtlExchangeRate.WFExchangeRateId()) {
            return 0;
        }
        var pair = self.currencyPair();
        if (!pair) {
            return 0;
        }
        if (self.item.ActualCurrencyId() === pair.baseCurrencyId && self.item.CurrencyId() === pair.counterCurrencyId) {
            return 1;
        } else if (self.item.ActualCurrencyId() === pair.counterCurrencyId && self.item.CurrencyId() === pair.baseCurrencyId) {
            return -1;
        } else {
            return 0;
        }
    });
    self.needExchangeRate = ko.computed(function () {
        return self.item.ActualCurrencyId() !== self.item.CurrencyId() && self.item.ActualCurrencyId() && self.item.CurrencyId();
    });
    self.exchangeRateConfigured = ko.computed(function () {
        return !self.needExchangeRate() ||
            self.exchangeRateDirection() && self.item.PtlExchangeRate.PriceDate() &&
            +self.item.PtlExchangeRate.BaseUnitAmount() > 0 && +self.item.PtlExchangeRate.CounterAmount() > 0;
    });
    self.exchangeRateOld = ko.observable(self.exchangeRateConfigured()
            ? (self.exchangeRateDirection() === 1
                ? self.item.PtlExchangeRate.CounterAmount() / self.item.PtlExchangeRate.BaseUnitAmount()
                : (self.exchangeRateDirection() === -1
                    ? self.item.PtlExchangeRate.BaseUnitAmount() / self.item.PtlExchangeRate.CounterAmount()
                    : 1))
            : NaN);
    self.exchangeRateComputed = ko.computed(function () {
        var val = self.exchangeRateConfigured()
            ? (self.exchangeRateDirection() === 1
                ? self.item.PtlExchangeRate.CounterAmount() / self.item.PtlExchangeRate.BaseUnitAmount()
                : (self.exchangeRateDirection() === -1
                    ? self.item.PtlExchangeRate.BaseUnitAmount() / self.item.PtlExchangeRate.CounterAmount()
                    : 1))
            : NaN;
        if (self.exchangeRateOld() !== val) {
            self.exchangeRateOld(val);
            if (self.bill.isByBill() && self.bill.isSelected() && self.associations().length === 1 && self.canUserEditAmount()) {
                var r = self.associations()[0];
                if (r.computeAmounts) {
                    var actualCurrencyFutureValue = utils.roundAmount(+self.item.WFExchangeBill.Amount());
                    var pvfvr = self.bill.pvfvr();
                    var exchangeRate = val;
                    r.computeAmounts(actualCurrencyFutureValue, pvfvr, exchangeRate);
                }
            } else {
                $.each(self.associations(), function (i, r) {
                    if (r.computeAmountsInverse) {
                        var amount = utils.roundAmount(+r.Amount());
                        var pvfvr = self.bill.pvfvr();
                        var exchangeRate = val;
                        r.computeAmountsInverse(amount, pvfvr, exchangeRate);
                    }
                });
            }
        }
        return val;
    });
    self.item.PtlExchangeRate.WFCurrencyPairId.subscribe(function (newValue) {
        var pair = utils.find(models.AllCurrencyPairs, function (r) {
            return r.id === newValue;
        });
        var defaultBua = (pair || {}).defaultBaseUnitAmountForUserInput || 1;
        self.item.PtlExchangeRate.BaseUnitAmount(defaultBua);
        self.item.PtlExchangeRate.CounterAmount(null);
    });
    self.onSetExchangeRate = function () {
        if ($('#ExchangeRateForm').valid()) {
            self.item.ExchangeRateId(self.item.PtlExchangeRate.WFExchangeRateId());
            $('#ExchangeRateModal').modal('hide');
        }
    };
    self.isNotSight = ko.computed(function () {
        return models.isNotSightBillType(self.item.PayType());
    });
    self.bill = new (function () {
        var bill = this;
        bill.isByBill = ko.computed(function () {
            return !!models.Enums.ExchangeBillType._Notes[self.item.PayType()];
        });
        bill.isForLc = ko.computed(function () {
            return models.isForLcBillType(self.item.PayType());
        });
        bill.isNotSight = self.isNotSight;
        bill.isSelected = ko.computed(function () {
            return self.item.WFExchangeBillId() === self.item.WFExchangeBill.WFExchangeBillId();
        });
        bill.futureValue = ko.computed(function () {
            return (bill.isByBill() && bill.isSelected()) ? utils.roundAmount(self.item.WFExchangeBill.Amount()) : null;
        });
        bill.presentValue = ko.computed(function () {
            return (bill.isByBill() && bill.isSelected())
                ? bill.isNotSight()
                    ? utils.roundAmount(+self.item.ActualCurrencyPresentValue())
                    : utils.roundAmount(self.item.WFExchangeBill.Amount())
                : null;
        });
        bill.pvfvrOld = ko.observable((bill.isByBill() && bill.isSelected() && bill.isNotSight()) ? bill.presentValue() / bill.futureValue() : 1);
        bill.pvfvr = ko.computed(function () {
            var val = (bill.isByBill() && bill.isSelected() && bill.isNotSight()) ? bill.presentValue() / bill.futureValue() : 1;
            if (bill.pvfvrOld() !== val) {
                bill.pvfvrOld(val);
                if (bill.isByBill() && bill.isSelected() && self.associations().length === 1 && self.canUserEditAmount()) {
                    var r = self.associations()[0];
                    if (r.computeAmounts) {
                        var actualCurrencyFutureValue = utils.roundAmount(+self.item.WFExchangeBill.Amount());
                        var pvfvr = val;
                        var exchangeRate = self.exchangeRateComputed();
                        r.computeAmounts(actualCurrencyFutureValue, pvfvr, exchangeRate);
                    }
                } else {
                    $.each(self.associations(), function (i, r) {
                        if (r.computeAmountsInverse) {
                            var amount = utils.roundAmount(+r.Amount());
                            var pvfvr = val;
                            var exchangeRate = self.exchangeRateComputed();
                            r.computeAmountsInverse(amount, pvfvr, exchangeRate);
                        }
                    });
                }
            }
            return val;
        });
        bill.toquery = {
            Code: ko.observable(),
            LetterOfCreditCode: ko.observable(),
            AccountingEntityId: ko.observable(),
        };
        bill.items = ko.observableArray();
        bill.list = bill.items;
        bill.onShow = function () {
            $('#MainForm').valid();
            if (!self.item.AccountingEntityId()) {
                alert('应选择品种、核算主体');
                return;
            }
            bill.items([]);
            //if (self.item.AccountingEntityId()) {
            //    bill.toquery.AccountingEntityId(self.item.AccountingEntityId());
            //}
            $('#BillModal').modal('show');
        };
        bill.onSearch = function () {
            var param = $.extend(ko.toJS(bill.toquery), {
                CorporationId: self.item.CorporationId(),
                AccountingEntityId: self.item.AccountingEntityId(),
                Type: self.item.PayType(),
                BillAmountUseStatus: models.Enums.ExchangeBillAmountUseStatus.AvailableForReceiveAmountRecord,
                CurrencyId: self.item.ActualCurrencyId(),
                IsDefaultJson: true
            });
            base._get(options.searchBillUrl, param, function (result) {
                var list = result.Data || [];
                bill.items(list);
            });
        };
        bill.onSelect = function (item) {
            ko.mapping.fromJS({ WFExchangeBill: item }, self.item);
            self.item.WFExchangeBillId(item.WFExchangeBillId);
            self.item.ActualCurrencyId(item.CurrencyId);
            if (!self.item.AccountingEntityId() && item.AccountingEntityId) {
                self.item.AccountingEntityId(item.AccountingEntityId);
            }

            //$('#BillModal').modal('hide');
        };
        bill.onDeselect = function () {
            self.item.WFExchangeBillId(null);
            ko.mapping.fromJS({ WFExchangeBill: route.values.newItem.WFExchangeBill }, self.item);
            self.item.ActualCurrencyPresentValue(null);
        };
    })();


    self.sumForContracts = ko.computed(function () {
        return self.selectedContracts().reduce(function (m, r) {
            m.amount = utils.roundAmount(m.amount + utils.roundAmount(r.Amount()));
            m.actualCurrencyAmount = utils.roundAmount(m.actualCurrencyAmount + utils.roundAmount(r.ActualCurrencyAmount()));
            m.settleCurrencyPresentValue = utils.roundAmount(m.settleCurrencyPresentValue + utils.roundAmount(r.SettleCurrencyPresentValue()));
            m.settleCurrencyFutureValue = utils.roundAmount(m.settleCurrencyFutureValue + utils.roundAmount(r.SettleCurrencyFutureValue()));
            m.actualCurrencyPresentValue = utils.roundAmount(m.actualCurrencyPresentValue + utils.roundAmount(r.ActualCurrencyPresentValue()));
            m.actualCurrencyFutureValue = utils.roundAmount(m.actualCurrencyFutureValue + utils.roundAmount(r.ActualCurrencyFutureValue()));
            return m;
        }, {
            amount: 0, actualCurrencyAmount: 0,
            settleCurrencyPresentValue: 0, settleCurrencyFutureValue: 0, actualCurrencyPresentValue: 0, actualCurrencyFutureValue: 0
        });
    });
    self.sumForInvoices = ko.computed(function () {
        return self.selectedCommercialInvoices().reduce(function (m, r) {
            m.amount = utils.roundAmount(m.amount + utils.roundAmount(r.Amount()));
            m.actualCurrencyAmount = utils.roundAmount(m.actualCurrencyAmount + utils.roundAmount(r.ActualCurrencyAmount()));
            m.settleCurrencyPresentValue = utils.roundAmount(m.settleCurrencyPresentValue + utils.roundAmount(r.SettleCurrencyPresentValue()));
            m.settleCurrencyFutureValue = utils.roundAmount(m.settleCurrencyFutureValue + utils.roundAmount(r.SettleCurrencyFutureValue()));
            m.actualCurrencyPresentValue = utils.roundAmount(m.actualCurrencyPresentValue + utils.roundAmount(r.ActualCurrencyPresentValue()));
            m.actualCurrencyFutureValue = utils.roundAmount(m.actualCurrencyFutureValue + utils.roundAmount(r.ActualCurrencyFutureValue()));
            return m;
        }, {
            amount: 0, actualCurrencyAmount: 0,
            settleCurrencyPresentValue: 0, settleCurrencyFutureValue: 0, actualCurrencyPresentValue: 0, actualCurrencyFutureValue: 0
        });
    });
    self.sumForFirePriceRecords = ko.computed(function () {
        return self.selectedFirePriceRecords().reduce(function (m, r) {
            m.amount = utils.roundAmount(m.amount + utils.roundAmount(r.Amount()));
            m.actualCurrencyAmount = utils.roundAmount(m.actualCurrencyAmount + utils.roundAmount(r.ActualCurrencyAmount()));
            m.settleCurrencyPresentValue = utils.roundAmount(m.settleCurrencyPresentValue + utils.roundAmount(r.SettleCurrencyPresentValue()));
            m.settleCurrencyFutureValue = utils.roundAmount(m.settleCurrencyFutureValue + utils.roundAmount(r.SettleCurrencyFutureValue()));
            m.actualCurrencyPresentValue = utils.roundAmount(m.actualCurrencyPresentValue + utils.roundAmount(r.ActualCurrencyPresentValue()));
            m.actualCurrencyFutureValue = utils.roundAmount(m.actualCurrencyFutureValue + utils.roundAmount(r.ActualCurrencyFutureValue()));
            return m;
        }, {
            amount: 0, actualCurrencyAmount: 0,
            settleCurrencyPresentValue: 0, settleCurrencyFutureValue: 0, actualCurrencyPresentValue: 0, actualCurrencyFutureValue: 0
        });
    });
    self.summary = ko.computed(function () {
        switch (+self.item.DetailObjectType()) {
            case models.Enums.AmountDetailObjectType.Contract:
                return self.sumForContracts();
            case models.Enums.AmountDetailObjectType.CommercialInvoice:
                return self.sumForInvoices();
            case models.Enums.AmountDetailObjectType.FirePriceRecord:
                return self.sumForFirePriceRecords();
            case models.Enums.AmountDetailObjectType.WarehouseFee:
            case models.Enums.AmountDetailObjectType.LogisticsFee:
            default:
                return {};
        }
    });
    self.settleCurrencyPresentValue = ko.computed(function () {
        return self.bill.isByBill() ? utils.roundAmount(self.bill.presentValue() * self.exchangeRateComputed()) : self.summary().settleCurrencyPresentValue;
    });
    self.settleCurrencyFutureValue = ko.computed(function () {
        return self.bill.isByBill() ? utils.roundAmount(self.bill.futureValue() * self.exchangeRateComputed()) : self.summary().settleCurrencyFutureValue;
    });
    self.actualCurrencyPresentValue = ko.computed(function () {
        return self.bill.isByBill() ? self.bill.presentValue() : self.summary().actualCurrencyPresentValue;
    });
    self.actualCurrencyFutureValue = ko.computed(function () {
        return self.bill.isByBill() ? self.bill.futureValue() : self.summary().actualCurrencyFutureValue;
    });
    self.amount = ko.computed(function () {
        return self.summary().amount;
    });
    self.actualCurrencyAmount = ko.computed(function () {
        return self.summary().actualCurrencyAmount;
    });

    self.selectedCorporationAccounts = ko.computed(function () {
        var corporationId = self.item.CorporationId();
        return (utils.find(models._AllCorporations, function (r) {
            return r.id === corporationId;
        }) || {}).accounts || [];
    });
    self.selectedBankAccount = ko.computed(function () {
        return utils.find(self.selectedCorporationAccounts(), function (r) {
            return r.id === self.item.CompanyBankInfoId();
        }) || {
        };
    });


    self.contract = new (function () {
        var contract = this;

        contract.items = ko.observableArray();
        contract.selectedItems = self.selectedContracts;
        contract.onSearch = function () {
            var query = utils.serialize("#searchForm .gmk-data-field");
            $.extend(query, {
                CustomerId: self.item.CustomerId(),
                CommodityId: self.item.CommodityId(),
                CurrencyId: self.item.CurrencyId(),
                CorporationId: self.item.CorporationId(),
                AccountingEntityId: self.item.AccountingEntityId(),
                //SalerId: self.item.SalerId(),
                //TradeType: self.item.TradeType()
            });
            base._get(options.searchContractUrl, query, function (result) {
                var data = $.grep(result, function (r) {
                    return $.grep(contract.selectedItems(), function (elem) {
                        return r.WFContractInfoId == elem.obj.WFContractInfoId;
                    }).length == 0;
                });
                $.each(data, function (i, r) {
                    r.isSelected = ko.observable();
                });
                contract.items(data);
            }, true);
        };
        contract.onSelect = function () {
            var data = $.grep(contract.items(), function (r) {
                return r.isSelected();
            });
            $.each(data, function (i, r) {
                contract.items.remove(r);
            });
            var oldDetails = ((self.amountRecord() || {}).Record || {}).WFAmountRecordDetails || [];
            for (var i = 0; i < data.length; i++) {
                var oldDetail = utils.find(oldDetails, function (r2) {
                    return r2.ObjectId === r.obj.WFContractInfoId;
                });
                var asct = new ReceivingContractViewModel(data[i], oldDetail);
                if (!oldDetail) {
                    var amount = 0;
                    if (asct.obj.WFSettlementRequestDetails && asct.obj.WFSettlementRequestDetails.length) {
                        amount = utils.roundAmount(asct.obj.WFSettlementRequestDetails[0].Amount);
                        //if (asct.obj.WFSettlementRequestDetails[0].IsPay) {
                        //    amount = 0 - amount;
                        //}
                    } else {
                        amount = utils.roundAmount(asct.ObjAmount() - asct.ObjAmountHappened() + asct.OldDetailAmount);
                    }
                    asct.computeAmountsInverse(amount);
                }
                contract.selectedItems.push(asct);
            }
            if (self.bill.isByBill() && self.bill.isSelected() && self.canUserEditAmount() && contract.selectedItems().length === 1) {
                var asct = contract.selectedItems()[0];
                var actualCurrencyFutureValue = utils.roundAmount(+self.item.WFExchangeBill.Amount());
                asct.computeAmounts(actualCurrencyFutureValue);
            }
        };
        contract.fill = function (objs, details) {
            contract.selectedItems.removeAll();
            if (self.isCreate && self.isForInvoiceFromContract) {
                self.item.PayPurposeType(models.Enums.PayPurposeType.MainTrade);
                self.item.DetailObjectType(models.Enums.AmountDetailObjectType.CommercialInvoice);
                if (objs.length) {
                    self.item.CustomerId(objs[0].CustomerId);
                    self.item.AccountingEntityId(objs[0].AccountingEntityId);
                    self.item.CurrencyId(objs[0].CurrencyId);
                    self.item.ActualCurrencyId(objs[0].CurrencyId);
                    self.item.CommodityId(objs[0].CommodityId);
                    self.item.SalerId(objs[0].SalerId);
                    self.item.TradeType(objs[0].TradeType);
                    self.item.PayType(objs[0].WFSettleOption.PaymentFormType);

                    self.invoice.toquery.ContractId(objs[0].WFContractInfoId);
                    self.invoice.toquery.ContractCode(objs[0].ContractCode);
                }
            }
            if (self.isCreate && (self.isForContractFromBalace || self.isFromContract)) {
                self.item.PayPurposeType(models.Enums.PayPurposeType.MainTrade);
                self.item.DetailObjectType(models.Enums.AmountDetailObjectType.Contract);
                if (objs.length) {
                    self.item.CustomerId(objs[0].CustomerId);
                    self.item.AccountingEntityId(objs[0].AccountingEntityId);
                    self.item.CurrencyId(objs[0].CurrencyId);
                    self.item.ActualCurrencyId(objs[0].CurrencyId);
                    self.item.CommodityId(objs[0].CommodityId);
                    self.item.SalerId(objs[0].SalerId);
                    self.item.TradeType(objs[0].TradeType);
                    self.item.PayType(objs[0].WFSettleOption.PaymentFormType);
                }
            }
            for (var i = 0; i < objs.length; i++) {
                var prd = utils.find(details || [], function (r) {
                    return r.WFContractInfoId == objs[i].WFContractInfoId;
                });
                var asct = new ReceivingContractViewModel(objs[i], prd);
                if (!prd) {
                    var amount = 0;
                    if (asct.obj.WFSettlementRequestDetails && asct.obj.WFSettlementRequestDetails.length) {
                        amount = utils.roundAmount(asct.obj.WFSettlementRequestDetails[0].Amount);
                        //if (asct.obj.WFSettlementRequestDetails[0].IsPay) {
                        //    amount = 0 - amount;
                        //}
                    }
                    if (route.values.contractId == asct.obj.WFContractInfoId) {
                        amount = utils.roundAmount(asct.ObjAmount() - asct.ObjAmountHappened() + asct.OldDetailAmount);
                    }
                    asct.computeAmountsInverse(amount);
                }
                contract.selectedItems.push(asct);
            }


        };
        contract.onRemove = function (r) {
            contract.selectedItems.remove(r);
        };
    })();
    //self.contractList = self.contract.items;
    //self.fillContract = self.contract.fill;
    //self.onSearchContract = self.contract.onSearch;
    //self.onRemoveContract = self.contract.onRemove;
    //self.onSelectContracts = self.contract.onSelect;

    self.invoice = new (function () {
        var invoice = this;
        invoice.toquery = {
            InvoiceCode: ko.observable(),
            ContractCode: ko.observable(),
            IsReceive: ko.observable(false),
            ContractId: ko.observable()
        };
        invoice.items = ko.observableArray();
        invoice.list = invoice.items;
        invoice.selectedItems = self.selectedCommercialInvoices;
        invoice.onSearch = function () {
            var param = $.extend(ko.toJS(invoice.toquery), {
                CorporationId: self.item.CorporationId(),
                AccountingEntityId: self.item.AccountingEntityId(),
                //SalerId: self.item.SalerId(),
                //TradeType: self.item.TradeType(),
                CustomerId: self.item.CustomerId(),
                CurrencyId: self.item.CurrencyId(),
                CommodityId: self.item.CommodityId(),
                InvoiceType: models.Enums.InvoiceType.CommercialInvoice,
                AvailableForAmount: true
            });
            base._get(options.searchCommercialInvoiceUrl, param, function (result) {
                var selectedIds = $.map(invoice.selectedItems(), function (r) {
                    return r.obj.WFInvoiceRecordId;
                });
                var list = $.map(result.Data.CommercialInvoices, function (r) {
                    var isSelected = $.inArray(r.WFInvoiceRecordId, selectedIds) !== -1;
                    return {
                        isChecked: ko.observable(),
                        isDisabled: ko.observable(isSelected),
                        obj: r
                    };
                });
                invoice.items(list);
            });
        };
        invoice.isAllChecked = ko.observable();
        invoice.isAllChecked.subscribe(function (val) {
            val = !!val;
            $.each(invoice.items(), function (i, r) {
                if (!r.isDisabled() && r.isChecked() !== val) {
                    r.isChecked(val);
                }
            });
        });
        invoice.onSelect = function () {
            var oldDetails = ((self.amountRecord() || {}).Record || {}).WFAmountRecordDetails || [];
            var selectedInvoices = $.map($.grep(invoice.items(), function (r) {
                return r.isChecked() && !r.isDisabled();
            }), function (r) {
                var oldDetail = utils.find(oldDetails, function (r2) {
                    return r2.ObjectId === r.obj.WFInvoiceRecordId;
                });
                var asct = new ReceivingInvoiceViewModel(r.obj, oldDetail);
                if (!oldDetail) {
                    var amount = utils.roundAmount(asct.ObjAmount() - asct.ObjAmountHappened() + asct.OldDetailAmount);
                    asct.computeAmountsInverse(amount);
                }
                return asct;
            });
            invoice.selectedItems(invoice.selectedItems().concat(selectedInvoices));
            if (self.bill.isByBill() && self.bill.isSelected() && self.canUserEditAmount() && invoice.selectedItems().length === 1) {
                var asct = invoice.selectedItems()[0];
                var actualCurrencyFutureValue = utils.roundAmount(+self.item.WFExchangeBill.Amount());
                asct.computeAmounts(actualCurrencyFutureValue);
            }
        };
        invoice.onSelectOne = function (r) {
            invoice.selectedItems.removeAll();
            $.each(invoice.items(), function (i, r) {
                r.isChecked(false);
            });
            r.isChecked(true);
            invoice.onSelect();
            self.item.CompanyBankInfoId(invoice.selectedItems()[0].obj.BeneficiaryBankAccountId);
        };
        invoice.fill = function (objs, details) {
            if (self.isCreate && self.isFromInvoice) {
                self.item.PayPurposeType(models.Enums.PayPurposeType.MainTrade);
                self.item.DetailObjectType(models.Enums.AmountDetailObjectType.CommercialInvoice);
                if (objs.length) {
                    var obj = objs[0];
                    self.item.CustomerId(obj.WFInvoiceRecord.CustomerId);
                    self.item.AccountingEntityId(obj.WFContractInfo.AccountingEntityId);
                    self.item.CurrencyId(obj.WFInvoiceRecord.CurrencyId);
                    self.item.ActualCurrencyId(obj.WFInvoiceRecord.CurrencyId);
                    self.item.CommodityId(obj.WFInvoiceRecord.CommodityId);
                    self.item.SalerId(obj.WFContractInfo.SalerId);
                    self.item.TradeType(obj.WFContractInfo.TradeType);
                    self.item.PayType(obj.WFInvoiceRecord.PaymentFormType);
                    self.item.CompanyBankInfoId(self.item.CompanyBankInfoId() || obj.BeneficiaryBankAccountId);
                }
            }
            invoice.selectedItems.removeAll();
            var selectedInvoices = $.map(objs, function (obj) {
                var detail = utils.find(details || [], function (r2) {
                    return r2.ObjectId === obj.WFInvoiceRecordId;
                });
                var asct = new ReceivingInvoiceViewModel(obj, detail);
                if (!detail) {
                    var amount = utils.roundAmount(asct.ObjAmount() - asct.ObjAmountHappened() + asct.OldDetailAmount);
                    asct.computeAmountsInverse(amount);
                }
                return asct;
            });
            invoice.selectedItems(selectedInvoices);
        };
        invoice.onRemove = function (r) {
            invoice.selectedItems.remove(r);
        };
    })();

    self.firePrice = new (function () {
        var firePrice = this;

        firePrice.items = ko.observableArray();
        firePrice.selectedItems = self.selectedFirePriceRecords;
        firePrice.isMarginAsPaymentdDisabled = ko.computed(function () {
            return !!(firePrice.selectedItems().length && firePrice.selectedItems()[0].obj.WFPriceDetail.WFPriceInfo.WFContractInfoes[0].IsBuy);
        });
        var _setMarginAsPaymentState = function () {
            if (firePrice.isMarginAsPaymentdDisabled()) {
                self.item.MarginAsPayment(null);
            }
        }
        firePrice.onSearch = function () {
            var query = $.extend(utils.serialize('#searchFormFirePriceMargin .gmk-data-field'), {
                CustomerId: self.item.CustomerId(),
                CorporationId: self.item.CorporationId(),
                CommodityId: self.item.CommodityId(),
                AccountingEntityId: self.item.AccountingEntityId(),
                CurrencyId: self.item.CurrencyId()
            });
            base._get(options.searchFirePriceRecordsUrl, query, function (result) {
                firePrice.items.removeAll();
                var data = $.grep(result.Data, function (r) {
                    return $.grep(firePrice.selectedItems(), function (r2) {
                        return r2.obj.WFFirePriceRecordId == r.WFFirePriceRecordId;
                    }).length == 0;
                });
                var list = $.map(data, function (r) {
                    return {
                        isChecked: ko.observable(),
                        obj: r
                    };
                });
                firePrice.items(list);
            });
        };
        firePrice.onSelect = function () {
            var data = $.grep(firePrice.items(), function (r) {
                return r.isChecked();
            });
            $.each(data, function (i, r) {
                firePrice.items.remove(r);
            });
            var oldDetails = ((self.amountRecord() || {}).Record || {}).WFAmountRecordDetails || [];

            $.each(data, function (i, r) {
                var oldDetail = utils.find(oldDetails, function (r2) {
                    return r2.ObjectId === r.obj.WFFirePriceRecordId;
                });
                var asct = new ReceivingFirePriceViewModel(r.obj, oldDetail);
                if (!oldDetail) {
                    var amount = utils.roundAmount(asct.ObjAmount() - asct.ObjAmountHappened() + asct.OldDetailAmount);
                    asct.computeAmountsInverse(amount);
                }
                firePrice.selectedItems.push(asct);
            });
            _setMarginAsPaymentState();
        };
        firePrice.fill = function (list, prds) {
            if (self.isFromFirePrice) {
                self.item.PayPurposeType(models.Enums.PayPurposeType.FirePriceMargin);
                self.item.DetailObjectType(models.Enums.AmountDetailObjectType.FirePriceRecord);
                self.item.CustomerId(list[0].WFPriceDetail.WFPriceInfo.WFContractInfoes[0].CustomerId);
                self.item.CommodityId(list[0].WFPriceDetail.WFPriceInfo.WFContractInfoes[0].CommodityId);
                self.item.AccountingEntityId(list[0].WFPriceDetail.WFPriceInfo.WFContractInfoes[0].DepartmentId);
                self.item.CurrencyId(list[0].CurrencyId);
                self.item.ActualCurrencyId(list[0].CurrencyId);
            }

            firePrice.selectedItems.removeAll();
            $.each(list, function (i, r) {

                var prd = utils.find(prds || [], function (r2) {
                    return r2.ObjectId == r.WFFirePriceRecordId;
                });

                var asct = new ReceivingFirePriceViewModel(r, prd);
                if (!prd) {
                    var amount = utils.roundAmount(asct.ObjAmount() - asct.ObjAmountHappened() + asct.OldDetailAmount);
                    asct.computeAmountsInverse(amount);
                }
                firePrice.selectedItems.push(asct);

            });

            _setMarginAsPaymentState();
        };
        firePrice.onRemove = function (asct) {
            firePrice.selectedItems.remove(asct);
            _setMarginAsPaymentState();
        };

    })();

    //self.firePriceRecordList = self.firePrice.items;
    //self.fillFirePriceRecord = self.firePrice.fill;
    //self.onSearchFirePriceMargin = self.firePrice.onSearch;
    //self.removeFirePriceRecord = self.firePrice.onRemove;
    //self.onSelectFirePriceMargin = self.firePrice.onSelect;

    self.onPreSelectAssociation = function () {
        if (!$('#MainForm').valid() || self.needExchangeRate() && !self.exchangeRateConfigured() || self.bill.isByBill() && !self.bill.isSelected()) {
            return;
        }
        switch (+self.item.DetailObjectType()) {
            case models.Enums.AmountDetailObjectType.Contract:
                self.contract.items([]);
                $('#SelectContractModal').modal('show');
                break;
            case models.Enums.AmountDetailObjectType.CommercialInvoice:
                self.invoice.items([]);
                $('#SelectInvoiceModal').modal('show');
                break;
            case models.Enums.AmountDetailObjectType.FirePriceRecord:
                self.firePrice.items([]);
                $('#SelectFirePriceMarginModal').modal('show');
                break;
            case models.Enums.AmountDetailObjectType.WarehouseFee:
            case models.Enums.AmountDetailObjectType.LogisticsFee:
            default:
                break;
        }
    };
    self.toJs = function () {
        if (self.item.WFAmountRecordId() !== (route.values.id || 0)) {
            self.item.WFAmountRecordId(route.values.id || 0);
        }
        if (self.item.IsPay() !== false) {
            self.item.IsPay(false);
        }
        var result = ko.mapping.toJS(self.item);
        if (!self.needExchangeRate() || !self.exchangeRateConfigured()) {
            result.ExchangeRateId = null;
            delete result.PtlExchangeRate;
        }
        if (!self.bill.isSelected()) {
            result.WFExchangeBillId = null;
            delete result.WFExchangeBill;
        }
        $.extend(result, {
            //WFAmountRecordId: route.values.id,
            //IsPay: false,
            Amount: self.amount(),
            ActualCurrencyAmount: self.actualCurrencyAmount(),
            SettleCurrencyPresentValue: self.settleCurrencyPresentValue(),
            SettleCurrencyFutureValue: self.settleCurrencyFutureValue(),
            ActualCurrencyPresentValue: self.actualCurrencyPresentValue(),
            ActualCurrencyFutureValue: self.actualCurrencyFutureValue()
        });
        result.WFAmountRecordDetails = $.map(self.associations(), function (r) {
            return r.toJs();
        });

        return result;
    }
    self.onSave = function () {
        if (!$('#MainForm').valid()) {
            return;
        }
        if (self.needExchangeRate() && !self.exchangeRateConfigured()) {
            alert('结算币种实收币种不同，应设置汇率');
            return;
        }
        if (self.bill.isByBill() && !self.bill.isSelected()) {
            alert('支付形式为票据，应选择票据');
            return;
        }
        if (self.isNotSight() && !self.item.ActualCurrencyPresentValue()) {
            alert('远期票据应该有现值');
            return;
        }
        //#MainForm,#FormQueryResult
        if (!$('#FormQueryResult').valid()) {
            return;
        }

        switch (+self.item.DetailObjectType()) {
            case models.Enums.AmountDetailObjectType.Contract:
                if (!self.associations().length) {
                    alert('请选择至少一个合同');
                    return;
                }
                break;
            case models.Enums.AmountDetailObjectType.CommercialInvoice:
                if (!self.associations().length) {
                    alert('请选择至少一个发票');
                    return;
                }
                break;
            case models.Enums.AmountDetailObjectType.FirePriceRecord:
                if (!self.associations().length) {
                    alert('请选择至少一条点价记录');
                    return;
                }
                if ($.grep(self.associations(), function (r) {
                    return r.obj.WFPriceDetail.WFPriceInfo.WFContractInfoes[0].WFContractInfoId !== self.associations()[0].obj.WFPriceDetail.WFPriceInfo.WFContractInfoes[0].WFContractInfoId;
                }).length > 0) {
                    alert('当前选中的点价记录的合同号必须相同');
                    return;
                }
                if (utils.roundAmount(utils.roundAmount(self.item.MarginAsPayment()) + utils.roundAmount(self.item.MarginReturned())) > self.sumForFirePriceRecords().amount) {
                    alert('退还金额与充当货款金额之和已经超出保证金总额');
                    return;
                }
                break;
            case models.Enums.AmountDetailObjectType.WarehouseFee:
            case models.Enums.AmountDetailObjectType.LogisticsFee:
            default:
                break;
        }
        if (self.summary().actualCurrencyFutureValue !== self.actualCurrencyFutureValue()) {
            alert('票据金额与收付款明细的实收币种终值合计应相等');
            return;
        }
        var param = self.toJs();
        base._saveThenBack(options.saveUrl, param);
    };
    self.fillRecord = function (data) {
        self.amountRecord(data);
        var record = ko.toJS(data.Record);
        record.PtlExchangeRate = record.PtlExchangeRate || route.values.newItem.PtlExchangeRate;
        record.WFExchangeBill = record.WFExchangeBill || route.values.newItem.WFExchangeBill;
        ko.mapping.fromJS(record, self.item);

        self.item.CustomerId(record.CustomerId);
        self.item.CompanyBankInfoId(record.CompanyBankInfoId);
        self.item.CurrencyId(record.CurrencyId);
        self.item.ActualCurrencyId(record.ActualCurrencyId);
        self.item.PayPurposeType(record.PayPurposeType);
        self.item.DetailObjectType(record.DetailObjectType);
        self.item.PayPurpose(record.PayPurpose);
        self.item.PayType(record.PayType);
        self.item.MarginReturned(record.MarginReturned);
        self.item.MarginAsPayment(record.MarginAsPayment);
        self.item.Note(record.Note);
        self.item.PayReceiveDate(record.PayReceiveDate);

        switch (+self.item.DetailObjectType()) {
            case models.Enums.AmountDetailObjectType.Contract:
                self.contract.fill(data.Contracts, data.Record.WFAmountRecordDetails);

                break;
            case models.Enums.AmountDetailObjectType.CommercialInvoice:
                self.invoice.fill(data.Associations, data.Record.WFAmountRecordDetails);
                break;
            case models.Enums.AmountDetailObjectType.FirePriceRecord:
                self.firePrice.fill(data.Associations, data.Record.WFAmountRecordDetails);
                break;
            case models.Enums.AmountDetailObjectType.WarehouseFee:
            case models.Enums.AmountDetailObjectType.LogisticsFee:
            default:
                break;
        }
    };
    self.initialize = function (callback) {
        if (!self.isCreate) {
            base._get(options.loadUrl, {
                id: route.values.id
            }, function (result) {
                self.fillRecord(result.Data);
                callback();
            }, true);
        } else if (self.isFromInvoice) {
            base._get(options.searchCommercialInvoiceUrl, {
                InvoiceRecordId: route.values.invoiceRecordId
            }, function (result) {
                self.invoice.fill(result.Data.CommercialInvoices);
                callback();
            });
        } else if (self.isForInvoiceFromContract) {
            base._get(options.searchContractUrl, {
                ContractId: route.values.contractIdForInvoice
            }, function (contracts) {
                self.contract.fill(contracts);
                callback();
            });
        } else if (self.isFromContract) {
            base._get(options.searchContractUrl, {
                ContractId: route.values.contractId
            }, function (contracts) {
                self.contract.fill(contracts);
                callback();
            }, true);
        } else if (self.isForContractFromBalace) {
            self.item.WFSettlementRequestId(route.values.balanceSettlementId);
            base._get(options.searchContractUrl, {
                BalanceSettlementId: route.values.balanceSettlementId,
                ContractId: route.values.contractId
            }, function (contracts) {
                self.contract.fill(contracts);
                callback();
            }, true);
        } else if (self.isFromFirePrice) {
            var old = $.ajaxSettings.traditional;
            $.ajaxSettings.traditional = true;
            base._get(options.searchFirePriceRecordsUrl, {
                firePriceRecordIds: route.values.firePriceRecordIds
            }, function (result) {
                self.firePrice.fill(result.Data);
                callback();
            });
            $.ajaxSettings.traditional = old;
        } else {
            callback();
        }
    }

    function ReceivingContractViewModel(obj, detail) {
        var asct = this;

        var objId = obj.WFContractInfoId;
        var inverseSign = obj.IsBuy;
        var objAmount = obj.AmountActualTotal;
        var objAmountHappened = obj.AmountHappened;
        var defaultIsAmountIncludeDiscountCost = obj.IsAmountIncludeDiscountCost;
        var getPvfvr = self.bill.pvfvr;
        var getExchangeRate = self.exchangeRateComputed;

        var baseAsct = new AssociationViewModel(obj, detail, objId, inverseSign, objAmount, objAmountHappened, defaultIsAmountIncludeDiscountCost, getPvfvr, getExchangeRate);
        $.extend(asct, baseAsct);
        asct.toJs = function () {
            return $.extend(baseAsct.toJs(), {
                WFContractInfoId: obj.WFContractInfoId
            });
        };
    }
    function ReceivingInvoiceViewModel(obj, detail) {
        var asct = this;

        var objId = obj.WFInvoiceRecordId;
        var inverseSign = obj.WFInvoiceRecord.IsReceive;
        var objAmount = obj.WFInvoiceRecord.TotalAmount;
        var objAmountHappened = obj.TotalHappendAmount;
        var defaultIsAmountIncludeDiscountCost = obj.WFInvoiceRecord.IsAmountIncludeDiscountCost;
        var getPvfvr = self.bill.pvfvr;
        var getExchangeRate = self.exchangeRateComputed;

        var baseAsct = new AssociationViewModel(obj, detail, objId, inverseSign, objAmount, objAmountHappened, defaultIsAmountIncludeDiscountCost, getPvfvr, getExchangeRate);
        $.extend(asct, baseAsct);
    }
    function ReceivingFirePriceViewModel(obj, detail) {

        obj.WFPriceDetail.WFPriceInfo.WFContractInfoes.sort(function (a, b) {
            return a.WFContractInfoId - b.WFContractInfoId;
        });

        var asct = this;
        asct.DepositProportion = ko.observable(+obj.WFPriceDetail.WFFirePriceDetail.MarginRate);
        var computeDeposit = function (depositProportion) {
            return utils.roundAmount(obj.Weight * (obj.Price +
                obj.WFPriceDetail.WFPriceInfo.WFContractInfoes[0].WFContractDetailInfoes[0].PremiumDiscount // ?
                ) * +depositProportion);
        };

        var objId = obj.WFFirePriceRecordId;
        var inverseSign = !((obj.WFPriceDetail.WFPriceInfo.WFContractInfoes[0].CorporationId !== GMK.Context.CorporationId) ^ obj.WFPriceDetail.WFPriceInfo.WFContractInfoes[0].IsBuy ^ obj.WFPriceDetail.WFFirePriceDetail.IsBuyerFire);
        var objAmount = computeDeposit(asct.DepositProportion());
        var objAmountHappened = obj.HappenedMargin;
        var defaultIsAmountIncludeDiscountCost = false;
        var getPvfvr = self.bill.pvfvr;
        var getExchangeRate = self.exchangeRateComputed;

        var baseAsct = new AssociationViewModel(obj, detail, objId, inverseSign, objAmount, objAmountHappened, defaultIsAmountIncludeDiscountCost, getPvfvr, getExchangeRate);
        $.extend(asct, baseAsct);

        asct.DepositProportion.subscribe(function (newVal) {
            asct.ObjAmount(asct.sign(computeDeposit(newVal)) || 0);
        });
    }
    function AssociationViewModel(obj, detail, objId, inverseSign, objAmount, objAmountHappened, defaultIsAmountIncludeDiscountCost, getPvfvr, getExchangeRate) {
        var asct = this;

        asct.obj = obj;
        asct.detail = detail;
        asct.ObjectId = objId;
        asct.InverseSign = !!inverseSign;
        var sign = asct.InverseSign ? function (num) {
            return -num;
        } : function (num) {
            return +num;
        };
        asct.sign = sign;
        asct.ObjAmount = ko.observable(utils.roundAmount(sign(objAmount) || 0));
        asct.ObjAmountHappened = ko.observable(utils.roundAmount(sign(objAmountHappened) || 0));
        asct.IsAmountIncludeDiscountCost = ko.observable(defaultIsAmountIncludeDiscountCost);

        asct.OldDetailAmount = utils.roundAmount((detail || {}).Amount || 0);
        asct.Amount = ko.observable(0);
        asct.ActualCurrencyAmount = ko.observable(0);
        asct.SettleCurrencyPresentValue = ko.observable(0);
        asct.SettleCurrencyFutureValue = ko.observable(0);
        asct.ActualCurrencyPresentValue = ko.observable(0);
        asct.ActualCurrencyFutureValue = ko.observable(0);
        asct.OldAmount = ko.observable(asct.OldDetailAmount);
        asct.HadPayAmount = ko.observable(0);
        asct.NotPayAmount = ko.observable(0);

        var calcApplyAmount = function (p_amount, p_oldamount, p_objAmount) {
            var amount = utils.roundAmount(+p_amount || 0);
            var oldamount = utils.roundAmount(+p_oldamount || 0);
            var amounthappened = asct.ObjAmountHappened();
            var amounttotal = utils.roundAmount(+p_objAmount || 0);

            var hadpayamount = utils.roundAmount(amounthappened + amount - oldamount);
            var notpayamount = utils.roundAmount(amounttotal - hadpayamount);
            asct.HadPayAmount(hadpayamount);
            asct.NotPayAmount(notpayamount);
        };
        asct.OldAmount.subscribe(function (val) {
            calcApplyAmount(asct.Amount(), val, asct.ObjAmount());
        });
        asct.Amount.subscribe(function (val) {
            calcApplyAmount(val, asct.OldAmount(), asct.ObjAmount());
        });
        asct.ObjAmount.subscribe(function (val) {
            calcApplyAmount(asct.Amount(), asct.OldAmount(), val);
        });
        calcApplyAmount(asct.Amount(), asct.OldAmount(), asct.ObjAmount());
        asct.computeAmounts = function (actualCurrencyFutureValue, pvfvr, exchangeRate) {
            pvfvr = pvfvr || getPvfvr();
            exchangeRate = exchangeRate || getExchangeRate();
            var actualCurrencyPresentValue = utils.roundAmount(actualCurrencyFutureValue * pvfvr);
            var settleCurrencyFutureValue = utils.roundAmount(actualCurrencyFutureValue * exchangeRate);
            var settleCurrencyPresentValue = utils.roundAmount(actualCurrencyPresentValue * exchangeRate);
            var actualCurrencyAmount = asct.IsAmountIncludeDiscountCost() ? actualCurrencyFutureValue : actualCurrencyPresentValue;
            var amount = asct.IsAmountIncludeDiscountCost() ? settleCurrencyFutureValue : settleCurrencyPresentValue;

            if (asct.ActualCurrencyFutureValue() !== actualCurrencyFutureValue) {
                asct.ActualCurrencyFutureValue(actualCurrencyFutureValue);
            }
            if (asct.ActualCurrencyPresentValue() !== actualCurrencyPresentValue) {
                asct.ActualCurrencyPresentValue(actualCurrencyPresentValue);
            }
            if (asct.SettleCurrencyFutureValue() !== settleCurrencyFutureValue) {
                asct.SettleCurrencyFutureValue(settleCurrencyFutureValue);
            }
            if (asct.SettleCurrencyPresentValue() !== settleCurrencyPresentValue) {
                asct.SettleCurrencyPresentValue(settleCurrencyPresentValue);
            }
            if (asct.ActualCurrencyAmount() !== actualCurrencyAmount) {
                asct.ActualCurrencyAmount(actualCurrencyAmount);
            }
            if (asct.Amount() !== amount) {
                asct.Amount(amount);
            }
        };
        asct.computeAmountsInverse = function (amount, pvfvr, exchangeRate) {
            pvfvr = pvfvr || getPvfvr();
            exchangeRate = exchangeRate || getExchangeRate();
            var actualCurrencyFutureValue, actualCurrencyPresentValue, settleCurrencyFutureValue, settleCurrencyPresentValue, actualCurrencyAmount;
            if (asct.IsAmountIncludeDiscountCost()) {
                settleCurrencyFutureValue = amount;
                actualCurrencyFutureValue = utils.roundAmount(settleCurrencyFutureValue / exchangeRate);
                actualCurrencyPresentValue = utils.roundAmount(actualCurrencyFutureValue * pvfvr);
                settleCurrencyPresentValue = utils.roundAmount(actualCurrencyPresentValue * exchangeRate);
                actualCurrencyAmount = actualCurrencyFutureValue;
            } else {
                settleCurrencyPresentValue = amount;
                actualCurrencyPresentValue = utils.roundAmount(settleCurrencyPresentValue / exchangeRate);
                actualCurrencyFutureValue = utils.roundAmount(actualCurrencyPresentValue / pvfvr);
                settleCurrencyFutureValue = utils.roundAmount(actualCurrencyFutureValue * exchangeRate);
                actualCurrencyAmount = actualCurrencyPresentValue;
            }

            if (asct.ActualCurrencyFutureValue() !== actualCurrencyFutureValue) {
                asct.ActualCurrencyFutureValue(actualCurrencyFutureValue);
            }
            if (asct.ActualCurrencyPresentValue() !== actualCurrencyPresentValue) {
                asct.ActualCurrencyPresentValue(actualCurrencyPresentValue);
            }
            if (asct.SettleCurrencyFutureValue() !== settleCurrencyFutureValue) {
                asct.SettleCurrencyFutureValue(settleCurrencyFutureValue);
            }
            if (asct.SettleCurrencyPresentValue() !== settleCurrencyPresentValue) {
                asct.SettleCurrencyPresentValue(settleCurrencyPresentValue);
            }
            if (asct.ActualCurrencyAmount() !== actualCurrencyAmount) {
                asct.ActualCurrencyAmount(actualCurrencyAmount);
            }
            if (asct.Amount() !== amount) {
                asct.Amount(amount);
            }
        };
        asct.AmountComputed = ko.computed({
            read: function () {
                var amount = utils.roundAmount(+asct.Amount());

                return $.isNumeric(amount) ? amount : null;
            },
            write: function (val) {
                var amount = utils.roundAmount(+val);
                asct.computeAmountsInverse(amount);
            }
        });
        asct.ActualCurrencyPresentValueAdjust = ko.computed({
            read: function () {
                var actualCurrencyPresentValue = utils.roundAmount(+asct.ActualCurrencyPresentValue());

                return $.isNumeric(actualCurrencyPresentValue) ? actualCurrencyPresentValue : null;
            },
            write: function (val) {
                var actualCurrencyPresentValue = utils.roundAmount(+val);
                if (!self.needExchangeRate() && self.isNotSight() && asct.IsAmountIncludeDiscountCost()) {
                    asct.ActualCurrencyPresentValue(actualCurrencyPresentValue);
                    asct.SettleCurrencyPresentValue(actualCurrencyPresentValue);
                }
            }
        });
        asct.ActualCurrencyFutureValueAdjust = ko.computed({
            read: function () {
                var actualCurrencyFutureValue = utils.roundAmount(+asct.ActualCurrencyFutureValue());

                return $.isNumeric(actualCurrencyFutureValue) ? actualCurrencyFutureValue : null;
            },
            write: function (val) {
                var actualCurrencyFutureValue = utils.roundAmount(+val);
                if (self.needExchangeRate()) {
                    if (self.isNotSight()) {
                        if (asct.IsAmountIncludeDiscountCost()) {
                            asct.ActualCurrencyFutureValue(actualCurrencyFutureValue);
                            asct.ActualCurrencyAmount(actualCurrencyFutureValue);
                        } else {
                            asct.ActualCurrencyFutureValue(actualCurrencyFutureValue);
                        }
                    } else {
                        asct.ActualCurrencyFutureValue(actualCurrencyFutureValue);
                        asct.ActualCurrencyAmount(actualCurrencyFutureValue);
                        asct.ActualCurrencyPresentValue(actualCurrencyFutureValue);
                    }
                } else {
                    if (self.isNotSight()) {
                        if (asct.IsAmountIncludeDiscountCost()) {
                            // 不微调
                        } else {
                            asct.ActualCurrencyFutureValue(actualCurrencyFutureValue);
                            asct.SettleCurrencyFutureValue(actualCurrencyFutureValue);
                        }
                    } else {
                        // 不微调
                    }
                }
                asct.computeAmounts(actualCurrencyFutureValue);
            }
        });
        asct.setDetail = function (detail) {
            if (detail) {
                asct.WFAmountRecordDetailId = detail.WFAmountRecordDetailId;
                var amount = utils.roundAmount(detail.Amount);
                var actualCurrencyAmount = utils.roundAmount(detail.ActualCurrencyAmount);
                var settleCurrencyPresentValue = utils.roundAmount(detail.SettleCurrencyPresentValue);
                var settleCurrencyFutureValue = utils.roundAmount(detail.SettleCurrencyFutureValue);
                var actualCurrencyPresentValue = utils.roundAmount(detail.ActualCurrencyPresentValue);
                var actualCurrencyFutureValue = utils.roundAmount(detail.ActualCurrencyFutureValue);
                asct.Amount(amount);
                asct.ActualCurrencyAmount(actualCurrencyAmount);
                asct.SettleCurrencyPresentValue(settleCurrencyPresentValue);
                asct.SettleCurrencyFutureValue(settleCurrencyFutureValue);
                asct.ActualCurrencyPresentValue(actualCurrencyPresentValue);
                asct.ActualCurrencyFutureValue(actualCurrencyFutureValue);
            }
        };
        asct.setDetail(detail);
        asct.toJs = function () {
            return $.extend({}, route.values.newDetail, {
                WFAmountRecordDetailId: asct.WFAmountRecordDetailId || 0,
                WFAmountRecordId: route.values.id,
                WFContractInfoId: null,
                Amount: utils.roundAmount(asct.Amount()),
                //IsPay: false,
                ObjectId: asct.ObjectId,
                ActualCurrencyAmount: utils.roundAmount(asct.ActualCurrencyAmount()),
                SettleCurrencyPresentValue: utils.roundAmount(asct.SettleCurrencyPresentValue()),
                SettleCurrencyFutureValue: utils.roundAmount(asct.SettleCurrencyFutureValue()),
                ActualCurrencyPresentValue: utils.roundAmount(asct.ActualCurrencyPresentValue()),
                ActualCurrencyFutureValue: utils.roundAmount(asct.ActualCurrencyFutureValue())
            });
        };
    }
}

