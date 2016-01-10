
var GMK = GMK || {};
GMK.Contract = GMK.Contract || {};
GMK.Contract.Details = GMK.Contract.Details || {};
GMK.Contract.Details.start = function (route, element, success) {
    GMK.Features.CommonModels.onReady(function (commonModels) {
        var viewModel = new GMK.Contract.Details.ViewModel(commonModels, route, {
            setStatusOfCommodityUrl: 'Contract/SetStatusOfCommodity',
            setStatusOfAmountUrl: 'Contract/SetStatusOfAmount',
            setStatusOfInvoiceUrl: 'Contract/SetStatusOfInvoice',
            getUrl: 'Contract/ContractWithCommodityRecordDetails',
            amountUrl: 'Contract/AmountDetails',
            invoiceUrl: 'Contract/InvoiceDetails',
            commercialInvoiceUrl: 'Contract/CommercialInvoiceDetails'
        });
        window.vm = viewModel;
        viewModel.initialize(function () {
            ko.applyBindings(viewModel, element);
            if (success) {
                success();
            }
        });
    });
};
GMK.Contract.Details.ContractWithCommodityViewModel = function (plainItem, commonModels, route, options) {
    var self = $.extend(this, ko.mapping.fromJS(plainItem));
    self.StatusOfCommodityFinished = ko.observable(self.StatusOfCommodity() == commonModels.Enums.ContractCommodityStatus.Finished);
    self.StatusOfAmountFinished = ko.observable(self.StatusOfAmount() == commonModels.Enums.ContractAmountStatus.Finished);
    self.StatusOfInvoiceFinished = ko.observable(self.StatusOfInvoice() == commonModels.Enums.ContractInvoiceStatus.Finished);
    self.AmountDisabled = ko.computed(function () {
        return self.StatusOfAmountFinished() && !commonModels.hasPermission('CancelFinishPayment');
    });
    self.CommodityDisabled = ko.computed(function () {
        return self.StatusOfCommodityFinished() && !commonModels.hasPermission('CancelFinishDelivery');
    });
    self.InvoiceDisabled = ko.computed(function () {
        return self.StatusOfInvoiceFinished() && !commonModels.hasPermission('CancelFinishInvoice');
    });
    self.onSetStatusOfCommodity = function () {
        confirm('确定要设置货品状态为已完成吗？', function () {
            base._post(options.setStatusOfCommodityUrl, {
                contractId: route.values.id,
                isCompleted: true
            }, function (result) {
                item.StatusOfCommodity(commonModels.Enums.ContractCommodityStatus.Finished);
            });
        });
    };
    self.onSetStatusOfAmount = function () {
        confirm('确定要设置款项状态为已完成吗？', function () {
            base._post(options.setStatusOfAmountUrl, {
                contractId: route.values.id,
                isCompleted: true
            }, function (result) {
                item.StatusOfAmount(commonModels.Enums.ContractAmountStatus.Finished);
            });
        });
    };
    self.onSetStatusOfInvoice = function () {
        confirm('确定要设置票据状态为已完成吗？', function () {
            base._post(options.setStatusOfInvoiceUrl, {
                contractId: route.values.id,
                isCompleted: true
            }, function (result) {
                item.StatusOfInvoice(commonModels.Enums.ContractInvoiceStatus.Finished);
            });
        });
    };
    self.sumDetailWeight = ko.computed(function () {
        var sum = 0;
        $.each(self.WFContractDetailInfoes(), function (i, d) {
            sum += utils.roundAmount(d.Weight(), 4);
        });
        return utils.roundAmount(sum, 4);
    });
    self.sumDetailErdWeight = ko.computed(function () {
        var sum = 0;
        $.each(self.WFContractDetailInfoes(), function (i, d) {
            $.each(d.WFContractEntryRecordDetails(), function (j, rd) {
                sum += utils.roundAmount(rd.Weight(), 4);
            });
        });
        return utils.roundAmount(sum, 4);
    });
    self.sumDetailErdActualWeight = ko.computed(function () {
        var sum = 0;
        $.each(self.WFContractDetailInfoes(), function (i, d) {
            $.each(d.WFContractEntryRecordDetails(), function (j, rd) {
                sum += utils.roundAmount(rd.ActualWeight(), 4);
            });
        });
        return utils.roundAmount(sum, 4);
    });
    self.sumDetailOrdWeight = ko.computed(function () {
        var sum = 0;
        $.each(self.WFContractDetailInfoes(), function (i, d) {
            $.each(d.WFContractOutRecordDetails(), function (j, rd) {
                sum += utils.roundAmount(rd.Weight(), 4);
            });
        });
        return utils.roundAmount(sum, 4);
    });
    self.sumDetailOrdActualWeight = ko.computed(function () {
        var sum = 0;
        $.each(self.WFContractDetailInfoes(), function (i, d) {
            $.each(d.WFContractOutRecordDetails(), function (j, rd) {
                sum += utils.roundAmount(rd.ActualWeight(), 4);
            });
        });
        return utils.roundAmount(sum, 4);
    });
    self.sumAmountIrdAmount = ko.computed(function () {
        var sum = 0;
        $.each(self.WFAmountRecordDetails(), function (i, rd) {
            var amount = rd.WFAmountRecord.IsPay() == self.IsBuy() ? rd.Amount() : -rd.Amount(); //收付款方向与合同方向不一致时，取负数
            sum = utils.roundAmount(sum + utils.roundAmount(amount));
        });
        return sum;
    });
    self.sumAmountOrdAmount = ko.computed(function () {
        var sum = 0;
        $.each(self.WFAmountRecordDetails(), function (i, rd) {
            var amount = rd.WFAmountRecord.IsPay() == self.IsBuy() ? rd.Amount() : -rd.Amount();
            sum = utils.roundAmount(sum + utils.roundAmount(amount));
        });
        return sum;
    });
    self.sumDetailInvoiceIrdWeight = ko.computed(function () {
        var sum = 0;
        $.each(self.WFContractDetailInfoes(), function (i, d) {
            $.each(d.WFContractInvoices(), function (j, rd) {
                if (rd.WFInvoiceRecord.IsReceive()) {
                    sum += utils.roundAmount(rd.Weight(), 4);
                }
            });
        });
        return utils.roundAmount(sum, 4);
    });
    self.sumDetailInvoiceIrdAmount = ko.computed(function () {
        var sum = 0;
        $.each(self.WFContractDetailInfoes(), function (i, d) {
            $.each(d.WFContractInvoices(), function (j, rd) {
                if (rd.WFInvoiceRecord.IsReceive()) {
                    sum += utils.roundAmount(rd.Amount());
                }
            });
        });
        return utils.roundAmount(sum);
    });
    self.sumDetailInvoiceOrdWeight = ko.computed(function () {
        var sum = 0;
        $.each(self.WFContractDetailInfoes(), function (i, d) {
            $.each(d.WFInvoiceRequestDetails(), function (j, rd) {
                if (rd.WFInvoiceRequest.Status() == commonModels.Enums.InvoiceRequestStatus.Finished) {
                    sum += utils.roundAmount(rd.Weight(), 4);
                }
            });
        });
        return utils.roundAmount(sum, 4);
    });
    self.sumDetailInvoiceOrdAmount = ko.computed(function () {
        var sum = 0;
        $.each(self.WFContractDetailInfoes(), function (i, d) {
            $.each(d.WFInvoiceRequestDetails(), function (j, rd) {
                if (rd.WFInvoiceRequest.Status() == commonModels.Enums.InvoiceRequestStatus.Finished) {
                    sum += utils.roundAmount(rd.Amount());
                }
            });
        });
        return utils.roundAmount(sum);
    });
    self.sumDetailInvoiceOqdWeight = ko.computed(function () {
        var sum = 0;
        $.each(self.WFContractDetailInfoes(), function (i, d) {
            $.each(d.WFInvoiceRequestDetails(), function (j, rd) {
                if (rd.WFInvoiceRequest.Status() != commonModels.Enums.InvoiceRequestStatus.Finished) {
                    sum += utils.roundAmount(rd.Weight(), 4);
                }
            });
        });
        return utils.roundAmount(sum, 4);
    });
    self.sumDetailInvoiceOqdAmount = ko.computed(function () {
        var sum = 0;
        $.each(self.WFContractDetailInfoes(), function (i, d) {
            $.each(d.WFInvoiceRequestDetails(), function (j, rd) {
                if (rd.WFInvoiceRequest.Status() != commonModels.Enums.InvoiceRequestStatus.Finished) {
                    sum += utils.roundAmount(rd.Amount());
                }
            });
        });
        return utils.roundAmount(sum);
    });
    $.each(self.WFContractDetailInfoes(), function (i, d) {
        d.collapseCommodity = ko.observable(false);
        d.collapseInvoice = ko.observable(false);
        d.sumErdWeight = ko.computed(function () {
            var sum = 0;
            $.each(d.WFContractEntryRecordDetails(), function (j, rd) {
                sum += utils.roundAmount(rd.Weight(), 4);
            });
            return utils.roundAmount(sum, 4);
        });
        d.sumErdActualWeight = ko.computed(function () {
            var sum = 0;
            $.each(d.WFContractEntryRecordDetails(), function (j, rd) {
                sum += utils.roundAmount(rd.ActualWeight(), 4);
            });
            return utils.roundAmount(sum, 4);
        });
        d.sumOrdWeight = ko.computed(function () {
            var sum = 0;
            $.each(d.WFContractOutRecordDetails(), function (j, rd) {
                sum += utils.roundAmount(rd.Weight(), 4);
            });
            return utils.roundAmount(sum, 4);
        });
        d.sumOrdActualWeight = ko.computed(function () {
            var sum = 0;
            $.each(d.WFContractOutRecordDetails(), function (j, rd) {
                sum += utils.roundAmount(rd.ActualWeight(), 4);
            });
            return utils.roundAmount(sum, 4);
        });
        d.sumInvoiceIrdWeight = ko.computed(function () {
            var sum = 0;
            $.each(d.WFContractInvoices(), function (j, rd) {
                if (rd.WFInvoiceRecord.IsReceive()) {
                    sum += utils.roundAmount(rd.Weight(), 4);
                }
            });
            return utils.roundAmount(sum, 4);
        });
        d.sumInvoiceIrdAmount = ko.computed(function () {
            var sum = 0;
            $.each(d.WFContractInvoices(), function (j, rd) {
                if (rd.WFInvoiceRecord.IsReceive()) {
                    sum += utils.roundAmount(rd.Amount());
                }
            });
            return utils.roundAmount(sum);
        });
        d.sumInvoiceOrdWeight = ko.computed(function () {
            var sum = 0;
            $.each(d.WFInvoiceRequestDetails(), function (j, rd) {
                if (rd.WFInvoiceRequest.Status() == commonModels.Enums.InvoiceRequestStatus.Finished) {
                    sum += utils.roundAmount(rd.Weight(), 4);
                }
            });
            return utils.roundAmount(sum, 4);
        });
        d.sumInvoiceOrdAmount = ko.computed(function () {
            var sum = 0;
            $.each(d.WFInvoiceRequestDetails(), function (j, rd) {
                if (rd.WFInvoiceRequest.Status() == commonModels.Enums.InvoiceRequestStatus.Finished) {
                    sum += utils.roundAmount(rd.Amount());
                }
            });
            return utils.roundAmount(sum);
        });
        d.sumInvoiceOqdWeight = ko.computed(function () {
            var sum = 0;
            $.each(d.WFInvoiceRequestDetails(), function (j, rd) {
                if (rd.WFInvoiceRequest.Status() != commonModels.Enums.InvoiceRequestStatus.Finished) {
                    sum += utils.roundAmount(rd.Weight(), 4);
                }
            });
            return utils.roundAmount(sum, 4);
        });
        d.sumInvoiceOqdAmount = ko.computed(function () {
            var sum = 0;
            $.each(d.WFInvoiceRequestDetails(), function (j, rd) {
                if (rd.WFInvoiceRequest.Status() != commonModels.Enums.InvoiceRequestStatus.Finished) {
                    sum += utils.roundAmount(rd.Amount());
                }
            });
            return utils.roundAmount(sum);
        });
    });
};
GMK.Contract.Details.InvoiceRecordDetailViewModel = function (plainItem) {
    var self = $.extend(this, ko.mapping.fromJS(plainItem));
};
GMK.Contract.Details.InvoiceRequestDetailViewModel = function (plainItem) {
    var self = $.extend(this, ko.mapping.fromJS(plainItem));
};
GMK.Contract.Details.AmountRecordDetailViewModel = function (plainItem) {
    var self = $.extend(this, ko.mapping.fromJS(plainItem));
};
GMK.Contract.Details.AmountRequestDetailViewModel = function (plainItem) {
    var self = $.extend(this, ko.mapping.fromJS(plainItem));
};
GMK.Contract.Details.BalanceSettlementDetailViewModel = function (plainItem) {
    var self = $.extend(this, ko.mapping.fromJS(plainItem));
};
GMK.Contract.Details.ViewModel = function (commonModels, route, options) {
    var self = this;
    self.commonModels = commonModels;
    var base = GMK.Features.FeatureBase;
    self.id = route.values.id;
    self.invoiceDetailViewModel = new GMK.Contract.CommericalInvoiceDetailViewModel(commonModels);

    self.needShowPledgeDiv = ko.observable(false);

    self.initialize = function (callback) {
        base._get(options.getUrl, { id: self.id }, function (result) {
            var data = result.Data;
            self.item = new GMK.Contract.Details.ContractWithCommodityViewModel(data, commonModels, route, options);
            self.needShowPledgeDiv(data.ContractType == commonModels.Enums.ContractType.PledgeContract && !data.IsBuy);
            self.loadedCommodity(true);
            self.item.priceInfo = self.getPriceInfo(data);
            self.item.paymentInfo = self.getPaymentInfo(data);

            if (route.values.tab === 'amount') {
                self.onTabAmount();
            } else if (route.values.tab === 'invoice') {
                self.onTabInvoice();
            } else if (route.values.tab === 'fee') {
                self.onTabFee();
            } else {
                self.onTabCommodity();
            }
            if (callback) {
                callback();
            }
        });
    };
    //价格信息
    self.getPriceInfo = function (data) {
        var priceInfo = "";
        var types = self.commonModels.Enums.PriceMakingType;
        if (data.PriceMakingType == types.FixPrice) { //定价
            priceInfo = "无";
        } else
            if (data.PriceMakingType == types.FirePrice && data.WFPriceInfo && data.WFPriceInfo.WFPriceDetails.length > 0) {//点价
                var firePrice = data.WFPriceInfo.WFPriceDetails[0].WFFirePriceDetail;
                if (firePrice) {
                    var exchange = self.commonModels.findById(self.commonModels._AllExchanges, firePrice.PriceMarket);
                    priceInfo = '点价方：{0}；市场：{1}；合约：{2}；计算方式：{3}；点价日期：{4}；保证金比例：{5}'.format(
                        (data.IsBuy ^ firePrice.IsBuyerFire) ? '客户' : '我方',
                        exchange.type & commonModels.Enums.CorporationTypeFlag.SpotPriceMakingMarket ? exchange.name : exchange.name,
                        commonModels.findInstrument(firePrice.InstrumentId),
                        commonModels.findPriceType(firePrice.PriceCalcType),
                        (firePrice.FireStartDate == null ? "暂无" : utils.formatDate(firePrice.FireStartDate, 'YYYY-MM-DD') + "至" + utils.formatDate(firePrice.FireEndDate, 'YYYY-MM-DD')),
                        firePrice.MarginRate);
                    if (self.commonModels.isForeignExchange(firePrice.PriceMarket)) {
                        priceInfo += "点价类型：" + commonModels.Enums.PricingType._Notes[firePrice.PricingType] + "；" + (firePrice.IsSwap ? "接受调期" : "不接受调期");
                    }
                }
            } else
                if (data.PriceMakingType == types.AvgPrice && data.WFPriceInfo && data.WFPriceInfo.WFPriceDetails.length > 0) {//均价
                    var avgPrice = data.WFPriceInfo.WFPriceDetails[0].WFAvgPriceDetail;
                    if (avgPrice) {
                        var exchange = self.commonModels.findById(self.commonModels._AllExchanges, avgPrice.PriceMarket);

                        priceInfo = '市场：{0}；合约信息：{1}；计算方式：{2}；点价日期：{3}至{4}；作价天数：{5}'.format(
                            exchange.type & commonModels.Enums.CorporationTypeFlag.SpotPriceMakingMarket ? exchange.name : exchange.name,
                            getAvgInstrument(avgPrice, exchange, data),
                            commonModels.findPriceType(avgPrice.PriceCalculateType),
                            utils.formatDate(avgPrice.StartTime, 'YYYY-MM-DD'),
                            utils.formatDate(avgPrice.EndTime, 'YYYY-MM-DD'),
                            avgPrice.DayCount);
                    }
                } else
                    if (data.PriceMakingType == types.ComplexPrice) {//复杂
                        priceInfo = "<span><a href='/PriceInfo/Index?contractId=" + data.WFContractInfoId + "'>查看相关作价信息</a></span>";
                    } else
                        if (data.PriceMakingType == types.Undeclared) {//待定
                            priceInfo = "暂无";
                        }

        return priceInfo;
    };

    function getAvgInstrument(avgPrice, exchange, data) {
        var code = "";
        if (avgPrice && data.WFPriceInfo.WFPriceDetails[0].WFPriceInstruments.length > 0) {
            if (!(exchange && exchange.name == "伦敦金属交易所")) {
                var lcdis = data.WFPriceInfo.WFPriceDetails[0].WFPriceInstruments;
                if (lcdis.length == 1) {
                    code = self.commonModels.findInstrument(lcdis[0].WFInstrumentId);
                } else {
                    $.each(lcdis, function (i, r) {
                        var startDate = r.StartDate != null ? r.StartDate : (lcdis[i - 1] ? lcdis[i - 1].EndDate : avgPrice.StartTime);
                        var endDate = r.EndDate != null ? r.EndDate : (lcdis[i + 1] ? lcdis[i + 1].StartDate : avgPrice.EndTime);
                        code += utils.formatDate(startDate) + "至" + utils.formatDate(endDate) + "（合约：" + self.commonModels.findInstrument(r.WFInstrumentId) + "）" + (i == lcdis.length ? "，" : "");
                    });
                }
            }
        } else
            code = "暂无";
        return code;
    }
    //支付信息
    self.getPaymentInfo = function (data) {
        var paymentInfo = "";
        var types = self.commonModels.Enums.ExchangeProcessType;
        var models = self.commonModels;
        if (data.WFSettleOption && (data.WFSettleOption.WFSettleOptionDetails.length) > 0) {
            var payment = data.WFSettleOption.WFSettleOptionDetails[0].WFSettleOptionDetailExchangeProcess;
            var type = payment.ExchangeProcessType;
            if (type == types.ConditionalRelease && payment.WFSodEpConditionalRelease) {//有条件放货
                var cr = payment.WFSodEpConditionalRelease;
                var wearhouse = models._findCompany(cr.CompanyId);
                paymentInfo = "第三方：" + (wearhouse ? wearhouse.shortName : "(暂无)");
            } else
                if (type == types.LetterOfCredit && payment.WFSodEpLetterOfCredit) {//信用证
                    var lc = payment.WFSodEpLetterOfCredit;
                    var licensingBank = models._findCompany(lc.IssuingBankId);
                    var notification = models._findCompany(lc.AdvisingBankId);
                    paymentInfo += "开证行：" + (licensingBank ? licensingBank.shortName : "(暂无)");
                    paymentInfo += "；通知行：" + (notification ? notification.shortName : "(暂无)");
                    paymentInfo += "；期限类型：" + models.Enums.TermType._Notes[lc.TermType];

                    if (lc.TermType == models.Enums.TermType.Usance) {
                        var pfExchangeBill = data.WFSettleOption.WFSettleOptionDetails[0].WFSettleOptionDetailPaymentForm.WFSodPfExchangeBill;
                        if (pfExchangeBill) {
                            paymentInfo += "；固定利率：" + (pfExchangeBill.DiscountRate || "");
                            if (lc.FloatInterestType) {
                                paymentInfo += "；浮动利率：" + models.Enums.FloatInterestType._Notes[pfExchangeBill.FloatInterestType];
                            }
                        }
                    }
                } else
                    if (type == types.DocumentsAgainstAcceptance && payment.WFSodEpDocumentsAgainstAcceptance) {//承兑交单
                        var da = payment.WFSodEpDocumentsAgainstAcceptance;
                        var buyer = models._findCompany(da.BuyerBankId);
                        var saler = models._findCompany(da.SalerBankId);
                        paymentInfo += "买方银行：" + (buyer ? buyer.shortName : "(暂无)");
                        paymentInfo += "；卖方银行：" + (saler ? saler.shortName : "(暂无)");
                        paymentInfo += "；金额：" + (utils.formatAmount(da.Amount) || "");
                    } else if (type == types.DocumentsAgainstPayment && payment.WFSodEpDocumentsAgainstPayment) {//付款交单
                        var dp = payment.WFSodEpDocumentsAgainstPayment;
                        var buyer = models._findCompany(dp.BuyerBankId);
                        var saler = models._findCompany(dp.SalerBankId);
                        paymentInfo += "买方银行：" + (buyer ? buyer.shortName : "(暂无)");
                        paymentInfo += "；卖方银行：" + (saler ? saler.shortName : "(暂无)");
                        paymentInfo += "；金额：" + (utils.formatAmount(dp.Amount) || "");

                    } else {
                        paymentInfo = "无";
                    }
        } else {
            paymentInfo = "暂无";
        }
        return paymentInfo;
    };

    self.onTabCommodity = function (data, event) {
        $(event && event.currentTarget || '#nav_commodity').tab('show');
    };
    self.onTabAmount = function (data, event) {
        if (!self.loadedAmount()) {
            self.loadAmount();
        }
        $(event && event.currentTarget || '#nav_amount').tab('show');
    };
    self.onTabInvoice = function (data, event) {
        if (!self.loadedInvoice()) {
            self.loadInvoice();
        }
        $(event && event.currentTarget || '#nav_invoice').tab('show');
    };
    self.onTabFee = function (data, event) {
        if (!self.loadedFee()) {
            self.loadFee();
        }
        $(event && event.currentTarget || '#nav_fee').tab('show');
    };
    self.loadedCommodity = ko.observable(false);
    self.loadedAmount = ko.observable(false);
    self.loadedInvoice = ko.observable(false);
    self.loadedFee = ko.observable(false);
    self.loadCommodity = function () {
    };
    self.loadAmount = function () {
        base._get(options.amountUrl, { id: self.id }, function (result) {
            var amountRecordDetails = result.Data.amountRecordDetails,
                amountRequestDetails = result.Data.amountRequestDetails,
                balanceSettlementDetails = result.Data.balanceSettlementDetails;
            self.item.WFAmountRecordDetails.removeAll();
            self.item.WFPayRequestDetails.removeAll();
            self.item.WFSettlementRequestDetails.removeAll();
            $.each(amountRecordDetails, function (i, d) {
                self.item.WFAmountRecordDetails.push(new GMK.Contract.Details.AmountRecordDetailViewModel(d));
            });
            $.each(amountRequestDetails, function (i, d) {
                self.item.WFPayRequestDetails.push(new GMK.Contract.Details.AmountRequestDetailViewModel(d));
            });
            $.each(balanceSettlementDetails, function (i, d) {
                self.item.WFSettlementRequestDetails.push(new GMK.Contract.Details.BalanceSettlementDetailViewModel(d));
            });
            self.loadedAmount(true);
        });
    };
    self.loadInvoice = function () {
        if (self.item.TradeType() & commonModels.Enums.SimpleTradeType.Domestic) {
            base._get(options.invoiceUrl, { id: self.id }, function (result) {
                var invoiceRecordDetails = result.Data.invoiceRecordDetails,
                    invoiceRequestDetails = result.Data.invoiceRequestDetails;
                $.each(self.item.WFContractDetailInfoes(), function (i, contractDetail) {
                    contractDetail.WFContractInvoices.removeAll();
                    contractDetail.WFInvoiceRequestDetails.removeAll();
                    $.each($.grep(invoiceRecordDetails, function (rd) {
                        return rd.WFContractDetailInfoId == contractDetail.WFContractDetailInfoId();
                    }), function (j, rd) {
                        contractDetail.WFContractInvoices.push(new GMK.Contract.Details.InvoiceRecordDetailViewModel(rd));
                    });
                    $.each($.grep(invoiceRequestDetails, function (rd) {
                        return rd.WFContractDetailInfoId == contractDetail.WFContractDetailInfoId();
                    }), function (j, rd) {
                        contractDetail.WFInvoiceRequestDetails.push(new GMK.Contract.Details.InvoiceRequestDetailViewModel(rd));
                    });
                });
                self.loadedInvoice(true);
            });
        } else {
            base._get(options.commercialInvoiceUrl, { id: self.id }, function (result) {
                self.invoiceDetailViewModel.init(result.data);
            });
        }
    };
    self.loadFee = function () {
        base._get('CostManagement/List', { ContractId: self.id }, function (result) {
            var fees = $.map(result.Data.list, function (r) {
                return ko.mapping.fromJS(r);
            });
            self.item.WFContractFees(fees);
            self.feeSummary.amount(result.Data.summary.amount);
            self.loadedFee(true);
        });
    };
    self.feeSummary = {
        amount: ko.observable()
    };
    self.onToggleCommodity = function (row) {
        row.collapseCommodity(!row.collapseCommodity());
    };
    self.onToggleInvoice = function (row) {
        row.collapseInvoice(!row.collapseInvoice());
    };
    self.RemarkNoteCommodity = ko.observable('');
    self.RemarkNoteAmount = ko.observable('');
    self.RemarkNoteInvoice = ko.observable('');
    self.ConfirmCommodity = ko.observable(false);
    self.ConfirmAmount = ko.observable(false);
    self.ConfirmInvoice = ko.observable(false);
    self.selectedContractDetailId = ko.observable(0);
    self.onSetStatusOfCommodity = function (validate, always) {
        if (validate()) {
            base._post(options.setStatusOfCommodityUrl, {
                contractId: route.values.id,
                isCompleted: !!self.item.StatusOfCommodityFinished(),
                remarkNote: self.RemarkNoteCommodity()
            }, function (result) {
                if (result.Status === true) {
                    self.item.StatusOfCommodity(commonModels.Enums.ContractCommodityStatus.Finished);
                    always();
                } else {
                    always();
                    isCancelling = true;
                    self.item.StatusOfCommodityFinished(!self.item.StatusOfCommodityFinished());
                    alert(result.Message);
                }
            });
        }
    };
    self.onSetStatusOfAmount = function (validate, always) {
        if (validate()) {
            base._post(options.setStatusOfAmountUrl, {
                contractId: route.values.id,
                isCompleted: !!self.item.StatusOfAmountFinished(),
                remarkNote: self.RemarkNoteAmount()
            }, function (result) {
                if (result.Status === true) {
                    self.item.StatusOfAmount(commonModels.Enums.ContractAmountStatus.Finished);
                    always();
                } else {
                    always();
                    isCancelling = true;
                    self.item.StatusOfAmountFinished(!self.item.StatusOfAmountFinished());
                    alert(result.Message);
                }
            });
        }
    };
    self.onSetStatusOfInvoice = function (validate, always) {
        if (validate()) {
            base._post(options.setStatusOfInvoiceUrl, {
                contractId: route.values.id,
                isCompleted: !!self.item.StatusOfInvoiceFinished(),
                remarkNote: self.RemarkNoteInvoice()
            }, function (result) {
                if (result.Status === true) {
                    self.item.StatusOfInvoice(commonModels.Enums.ContractInvoiceStatus.Finished);
                    always();
                } else {
                    always();
                    isCancelling = true;
                    self.item.StatusOfInvoiceFinished(!self.item.StatusOfInvoiceFinished());
                    alert(result.Message);
                }
            });
        }
    };
    self.SwitchChangeHandler = function () {
        //if (isCancelling) {
        //    isCancelling = false;
        //    return;
        //}
        var param = arguments[1], $elem = param.el, value = param.value, $target = $($elem.data('target'));
        $target.modal({ keyboard: false });
        $target.modal('show');
    };
    var isCancelling = false;
    self.CloseFinishInvoiceConfirm = function () {
        $('#finishInvoiceConfirm').modal('hide');
        isCancelling = true;
        self.item.StatusOfInvoiceFinished(!self.item.StatusOfInvoiceFinished());
    };
    self.CloseFinishAmountConfirm = function () {
        $('#finishAmountConfirm').modal('hide');
        isCancelling = true;
        self.item.StatusOfAmountFinished(!self.item.StatusOfAmountFinished());
    };
    self.CloseFinishCommodityConfirm = function () {
        $('#finishCommodityConfirm').modal('hide');
        isCancelling = true;
        self.item.StatusOfCommodityFinished(!self.item.StatusOfCommodityFinished());
    };
    var timeout, persist, before = 0, throttle = 100, step = throttle / 2;
    self.contractDetailSelected = function (item) {
        function inner() {
            var now = $.now();
            if (!before) {
                before = now;
                return;
            }
            if (now - before < throttle) {
                return;
            }
            self.selectedContractDetailId(item.WFContractDetailInfoId());
            persist = false;
            clearInterval(timeout);
            timeout = null;
        }
        if (timeout) {
            clearInterval(timeout);
        }
        before = 0;
        timeout = setInterval(inner, 50);
    }
    self.contractDetailUnselected = function (cancelable) {
        if (timeout) {
            clearInterval(timeout);
            before = 0;
            timeout = null;
        }
        if (!persist) self.selectedContractDetailId(null);
    }
    self.contractDetailPersistSelected = function (item) {
        if (timeout) {
            clearInterval(timeout);
            before = 0;
            timeout = null;
        }
        if (persist == true && (self.selectedContractDetailId() == item.WFContractDetailInfoId())) {
            persist = false;
            self.selectedContractDetailId(null);
            return;
        }
        persist = true;
        self.selectedContractDetailId(item.WFContractDetailInfoId());
    }
};

GMK.Contract.CommericalInvoiceDetailViewModel = function (commonModels) {
    var self = this;
    this.list = ko.observableArray([]);
    this.pageSummary = {
        totalAmount: ko.observable(),
        totalHappendAmount: ko.observable(),
        totalWeight: ko.observable(),
        count: ko.observable(),
    };
    var _methods = {
        init: function (data) {
            self.list(data.commercialInvoices);
            //var amount = 0, weight = 0, count = 0, happendAmount = 0;
            //$.each(data.commercialInvoices, function (i, r) {
            //    count++;
            //    amount += r.wfInvoiceRecord.totalAmount;
            //    weight += r.wfInvoiceRecord.totalWeight;
            //    happendAmount += r.totalHappendAmount;
            //});
            self.pageSummary.totalAmount(data.amount);
            self.pageSummary.totalWeight(data.weight);
            self.pageSummary.totalHappendAmount(data.totalHappenedAmount);
            self.pageSummary.count(data.count);
            $("#invoiceDetailTable").expandable();
        },
    };

    $.extend(this, _methods);
};
