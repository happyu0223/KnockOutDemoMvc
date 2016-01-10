
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
            invoiceUrl: 'Contract/InvoiceDetails'
        });
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
            var amount = rd.IsPay() ? -rd.Amount() : rd.Amount();
            sum = utils.roundAmount(sum + utils.roundAmount(amount));
        });
        return sum;
    });
    self.sumAmountOrdAmount = ko.computed(function () {
        var sum = 0;
        $.each(self.WFAmountRecordDetails(), function (i, rd) {
            var amount = rd.IsPay() ? rd.Amount() : -rd.Amount();
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
    self.initialize = function (callback) {
        base._get(options.getUrl, { id: self.id }, function (result) {
            var data = result.Data;
            self.item = new GMK.Contract.Details.ContractWithCommodityViewModel(data, commonModels, route, options);
            self.loadedCommodity(true);
            if (callback) {
                callback();
            }
        });
    };
    self.onTabCommodity = function (data, event) {
        //if (!self.loadedCommodity()) {
        //    self.loadCommodity();
        //}
        $(event.currentTarget).tab('show');
    };
    self.onTabAmount = function (data, event) {
        if (!self.loadedAmount()) {
            self.loadAmount();
        }
        $(event.currentTarget).tab('show');
    };
    self.onTabInvoice = function (data, event) {
        if (!self.loadedInvoice()) {
            self.loadInvoice();
        }
        $(event.currentTarget).tab('show');
    };
    self.loadedCommodity = ko.observable(false);
    self.loadedAmount = ko.observable(false);
    self.loadedInvoice = ko.observable(false);
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
        $target.modal({keyboard:false});
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

    self.contractDetailSelected = function (item, event) {
        self.selectedContractDetailId(item.WFContractDetailInfoId());
    }
    self.contractDetailUnselected = function (item) {
        self.selectedContractDetailId(null);
    }
};
