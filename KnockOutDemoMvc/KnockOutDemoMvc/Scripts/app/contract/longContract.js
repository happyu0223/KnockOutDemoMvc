
var GMK = GMK || {};
GMK.LongContract = GMK.LongContract || {};


GMK.LongContract.start = function (route, element, success) {
    GMK.Features.CommonModels.onReady(function (commonModels) {
        if (route.action === 'LongIndex') {
            var viewModel = new GMK.LongContract.IndexViewModel(commonModels, route, {
                searchUrl: route.baseUrl + 'LongList',
                longDetailsUrl: route.baseUrl + 'LongDetailsList',
                longDetailsAllUrl: route.baseUrl + 'LongDetailsAllList',
                deleteUrl: route.baseUrl + 'LongDelete',
                detailsDeleteUrl: route.baseUrl + 'LongDetailsDelete',
                cancelUrl: route.baseUrl + 'Cancel',
                revertCancelUrl: route.baseUrl + 'RevertCancel',
                finishUrl: route.baseUrl + 'Finish',
                revertFinishUrl: route.baseUrl + 'RevertFinish',
                setStatusOfCommodityUrl: route.baseUrl + 'SetStatusOfCommodity',
                setStatusOfAmountUrl: route.baseUrl + 'SetStatusOfAmount',
                setStatusOfInvoiceUrl: route.baseUrl + 'SetStatusOfInvoice',
                getSapInfoUrl: route.baseUrl + 'GetSapInfo',
                saveSapInfoUrl: route.baseUrl + 'SaveSapInfo'
            });
            ko.applyBindings(viewModel, element);
            viewModel.commonModels.registerQueryFormEvent();
            function initialize(query) {
                if (query.IsBuy != null) query.IsBuy = query.IsBuy.toString();
                query = $.extend({}, viewModel.defaultQuery, query);
                if (query) ko.mapping.fromJS(query, { ignore: ['pagination', 'Pagination'] }, viewModel.query);
                viewModel.initialize(query);
            }
            utils.responseStateChange();
            initialize(commonModels.getQuery());
            commonModels.registerStateChange(function (data) {
                initialize(data);
            });
        } else if (route.action === 'LongCreate') {
            var viewModel = new GMK.LongContract.CreateViewModel(commonModels, route, {
                indexUrl: route.baseUrl + 'LongIndex',
                saveUrl: route.baseUrl + 'LongCreate',
                generateContractCodeUrl: route.baseUrl + 'GenerateContractCode'
            });
            window.vm = viewModel;
            viewModel.initialize(function () {
                ko.applyBindings(viewModel, element);
                viewModel.item.IsBuy.subscribe(function () {
                    viewModel.item.ContractCode('');
                });
                viewModel.item.CommodityIdSelected.subscribe(function () {
                    viewModel.item.ContractCode('');
                });
                if (success) {
                    success();
                }
            });
        } else if (route.action === 'LongEdit') {
            var viewModel = new GMK.LongContract.EditViewModel(commonModels, route, {
                getUrl: route.baseUrl + 'LongGet',
                indexUrl: route.baseUrl + 'LongIndex',
                saveUrl: route.baseUrl + 'LongEdit'
            });
            window.vm = viewModel;
            viewModel.initialize(function () {
                ko.applyBindings(viewModel, element);
                if (success) {
                    success();
                }
            });
        } else if (route.action === 'LongContractPrice') {
            var viewModel = new GMK.LongContract.LongContractPriceViewModel(commonModels, route, {
                getUrl: route.baseUrl + 'GetLongContractPrice',
                saveUrl: route.baseUrl + 'SaveLongContractPrice',
                reloadUrl: route.reloadUrl,
                detailId: route.detailId
            });
            viewModel.initialize(function () {
                ko.applyBindings(viewModel, element);
            });
        }
    });
};

GMK.LongContract.ItemViewModel = function (plainItem, commonModels) {
    var self = $.extend(this, ko.mapping.fromJS(plainItem));
    if (plainItem.WFSettleOption)
        self.SpotAmountType(plainItem.WFSettleOption.ExchangeProcessType);
    self.CommodityIdSelected = ko.computed({
        read: self.CommodityId,
        write: function (value) {
            self.CommodityId(value);
            var salers = commonModels.findSalers(value);
            var salerId = salers && salers.length > 0 ? salers[0].id : null;
            self.SalerId(salerId);
            var unitId = commonModels.findUnitId(value);
            self.UnitId(unitId);
        }
    });
};

GMK.LongContract.ListItemViewModel = function (plainItem) {
    var self = $.extend(this, ko.mapping.fromJS(plainItem), { showDetails: ko.observable(false), longDetails: ko.observableArray() });
};

GMK.LongContract.LongDetailsItemViewModel = function (plainItem, commonModels, route) {
    var self = $.extend(this, ko.mapping.fromJS(plainItem), { showDetails: ko.observable(false) });
    self.StatusOfCommodityFinished = ko.computed(function () {
        return self.StatusOfCommodity() == commonModels.Enums.ContractCommodityStatus.Finished;
    });
    self.StatusOfAmountFinished = ko.computed(function () {
        return self.StatusOfAmount() == commonModels.Enums.ContractAmountStatus.Finished;
    });
    self.StatusOfInvoiceFinished = ko.computed(function () {
        return self.StatusOfInvoice() == commonModels.Enums.ContractInvoiceStatus.Finished;
    });
    self.CommodityTotal = ko.computed(function () {
        var sum = 0;
        $.each(self.WFContractDetailInfoes(), function (i, r) {
            sum += (r.Weight() || 0);
        });
        return sum;
    });
    self.commodityUrl = ko.computed(function () {
        return self.IsBuy()
            ? route.commodityInUrl + '?' + $.param({ ContractCode: self.ContractCode(), CommodityId: self.CommodityId(), ReceiveType: commonModels.Enums.SpotReceiveType.ForContract })
            : route.commodityOutUrl + '?' + $.param({ ContractCode: self.ContractCode(), CommodityId: self.CommodityId(), ReceiveType: commonModels.Enums.SpotReceiveType.ForContract });
    });
    self.amountUrl = ko.computed(function () {
        return self.IsBuy() ? route.amountPayUrl + '?' + $.param({ ContractId: self.WFContractInfoId() }) : route.amountReceiveUrl + '?' + $.param({ ContractId: self.WFContractInfoId() });
    });
    self.invoiceUrl = ko.computed(function () {
        var url = '';
        if (self.IsBuy()) {
            if (self.TradeType() & commonModels.Enums.SimpleTradeType.Foreign) {
                url = GMK.Context.RootUrl + 'CommercialInvoice/ReceiveIndex?ContractId=' + self.WFContractInfoId() + '&ContractCode=' + self.ContractCode();
            } else
                url = GMK.Context.RootUrl + 'Invoice/ReceivingRecords?ContractId=' + self.WFContractInfoId() + '&ContractCode=' + self.ContractCode();
        } else {
            if (self.TradeType() & commonModels.Enums.SimpleTradeType.Foreign) {
                url = GMK.Context.RootUrl + 'CommercialInvoice/PayIndex?ContractId=' + self.WFContractInfoId();
            } else
                url = GMK.Context.RootUrl + 'Invoice/InvoiceRequests?ContractId=' + self.WFContractInfoId();
        }
        return url;
    });
};

GMK.LongContract.IndexViewModel = function (commonModels, route, options) {
    var self = this;
    self.commonModels = commonModels;
    var base = GMK.Features.FeatureBase;
    self.items = ko.observableArray();
    var currentQuery = {
        ContractType: commonModels.Enums.ContractType.LongContract,
        ContractCode: null,
        CustomerId: null,
        IsBuy: null,
        CommodityId: null,
        DateRange: null,
        ContractStatus: null
    };
    self.defaultQuery = currentQuery;
    self.query = ko.mapping.fromJS(currentQuery);
    var expandingItem, $longContractTable = $('#LongContractTable');
    function _initializeExpandable() {
        if ($longContractTable.expandable('instance')) $longContractTable.expandable('destroy');
        $longContractTable.expandable({
            toggleCallback: function (e) {
                expandingItem = e.target;
                self.toggleLongDetails(self.items()[parseInt(e.target.closest('tr').attr('id').substr('state_'.length), 10)]);
            }
        });
    }
    function search(q) {
        base._get(options.searchUrl, q || ko.mapping.toJS(self.query), function (result) {
            self.fillItems(result);
        });
    }
    self.initialize = function (q) {
        search(q);
    };
    self.onSearch = function () {
        utils.responseStateChange(false);
        search();
    };
    self.fillItems = function (result) {
        self.items.removeAll();
        $.each(result.Data.result, function (i, item) {
            self.items.push(new GMK.LongContract.ListItemViewModel(item));
        });
        _initializeExpandable();
        base._paginate($(route.values.pager), result.Data.pagination, function () {
            return $.extend(true, {}, ko.mapping.toJS(self.query));
        }, options.searchUrl, self.fillItems);
    };
    function loadLongDetails(item, url, callback) {
        base._get(url, {
            id: item.WFContractInfoId()
        }, callback);
    }
    self.toggleLongDetails = function (item) {
        if (item.longDetails().length === 0) {
            loadLongDetails(item, options.longDetailsUrl, function (result) {
                item.longDetails.removeAll();
                $.each(result.Data, function (i, longDetailsItem) {
                    item.longDetails.push(new GMK.LongContract.LongDetailsItemViewModel(longDetailsItem, commonModels, route));
                });
                if (expandingItem) $longContractTable.trigger('expanded.expandable', { target: expandingItem });
                expandingItem = null;
            });
        }
    };
    self.onLoadAllDetails = function (item, event) {
        loadLongDetails(this, options.longDetailsAllUrl, function (result) {
            $.each(result.Data, function (i, longDetailsItem) {
                item.longDetails.push(new GMK.LongContract.LongDetailsItemViewModel(longDetailsItem, commonModels, route));
            });
            $longContractTable.trigger('expanded.expandable', { target: $($(event.currentTarget).closest('table').closest('tr').prev().children('td')[0]).children('i') });
            $(event.currentTarget).attr('disabled', 'disabled');
        });
    };
    self.toggleDetails = function (item, event) {
        item.showDetails(!item.showDetails());
        $longContractTable.trigger('expanded.expandable', { target: $($(event.currentTarget).closest('table').closest('tr').prev().children('td')[0]).children('i') });
        $(event.currentTarget).attr('disabled', 'disabled');
    };
    self.currentItem = null;
    self.RemarkNote = ko.observable('');
    self.cancelable = function (item) {
        return item.StatusOfContract() === self.commonModels.Enums.ContractStatus.Default;
    };
    self.revertCancelable = function (item) {
        return item.StatusOfContract() === self.commonModels.Enums.ContractStatus.Invalid;
    };
    self.finishable = function (item) {
        return item.StatusOfContract() === self.commonModels.Enums.ContractStatus.Default;
    };
    self.revertFinishable = function (item) {
        return item.StatusOfContract() === self.commonModels.Enums.ContractStatus.Finished;
    };
    var cancelCallback = null;
    self.onCancel = function (item, event) {
        self.currentItem = item;
        self.RemarkNote('');
        cancelCallback = function () {
            self.items.remove(item);
        };
    };
    self.onSubmitCancel = function (item, event) {
        confirm('你确定要作废当前合同吗？', function () {
            base._post(options.cancelUrl, {
                contractId: self.currentItem.WFContractInfoId(),
                remarkNote: self.RemarkNote()
            }, function (result) {
                self.currentItem.StatusOfContract(self.commonModels.Enums.ContractStatus.Invalid);
                $(event.currentTarget).closest('.modal').modal('hide');
                if (cancelCallback) cancelCallback();
            });
        });
    };
    self.onRevertCancelLongDetail = function (item, event) {
        confirm('你确定要取消作废当前合同吗？', function () {
            base._post(options.revertCancelUrl, {
                contractId: item.WFContractInfoId()
            }, function (result) {
                item.StatusOfContract(self.commonModels.Enums.ContractStatus.Default);
            });
        });
    };
    self.onCancelLongDetail = function (item, event) {
        self.currentItem = item;
        self.RemarkNote('');
        var tr = $(event.currentTarget).closest('tr');
        cancelCallback = function () {
            tr.remove();
        };
    };
    self.onFinishLongDetail = self.onCancelLongDetail;
    self.onSubmitFinishLongDetail = function (validate, success) {
        if (validate()) {
            base._post(options.finishUrl, {
                contractId: self.currentItem.WFContractInfoId(),
                remarkNote: self.RemarkNote()
            }, function (result) {
                self.currentItem.StatusOfContract(self.commonModels.Enums.ContractStatus.Finished);
                success();
            });
        }
    };
    self.onRevertFinishLongDetail = self.onCancelLongDetail;
    self.onSubmitRevertFinishLongDetail = function (validate, success) {
        if (validate()) {
            base._post(options.revertFinishUrl, {
                contractId: self.currentItem.WFContractInfoId(),
                remarkNote: self.RemarkNote()
            }, function (result) {
                self.currentItem.StatusOfContract(self.commonModels.Enums.ContractStatus.Default);
                success();
            });
        }
    };
    self.onSetStatusOfCommodity = function (item) {
        var newStatus = !(item.StatusOfCommodity() == commonModels.Enums.ContractCommodityStatus.Finished);
        confirm(newStatus ? '确定要设置货品状态为已完成吗？' : '确定要设置货品状态为未完成吗？', function () {
            base._post(options.setStatusOfCommodityUrl, {
                contractId: item.WFContractInfoId(),
                isCompleted: newStatus
            }, function (result) {
                item.StatusOfCommodity(newStatus ? commonModels.Enums.ContractCommodityStatus.Finished : commonModels.Enums.ContractCommodityStatus.Default);
            });
        });
        item.StatusOfCommodity.valueHasMutated();
    };
    self.onSetStatusOfAmount = function (item, e) {
        var newStatus = !(item.StatusOfAmount() == commonModels.Enums.ContractAmountStatus.Finished);
        confirm(newStatus ? '确定要设置款项状态为已完成吗？' : '确定要设置款项状态为未完成吗？', function () {
            base._post(options.setStatusOfAmountUrl, {
                contractId: item.WFContractInfoId(),
                isCompleted: newStatus
            }, function (result) {
                item.StatusOfAmount(newStatus ? commonModels.Enums.ContractAmountStatus.Finished : commonModels.Enums.ContractAmountStatus.Default);
            });
        });
        item.StatusOfAmount.valueHasMutated();
    };
    self.onSetStatusOfInvoice = function (item, e) {
        var newStatus = !(item.StatusOfInvoice() == commonModels.Enums.ContractInvoiceStatus.Finished);
        confirm(newStatus ? '确定要设置票据状态为已完成吗？' : '确定要设置票据状态为未完成吗？', function () {
            base._post(options.setStatusOfInvoiceUrl, {
                contractId: item.WFContractInfoId(),
                isCompleted: newStatus
            }, function (result) {
                item.StatusOfInvoice(newStatus ? commonModels.Enums.ContractInvoiceStatus.Finished : commonModels.Enums.ContractInvoiceStatus.Default);
            });
        });
        item.StatusOfInvoice.valueHasMutated();
    };
    self.getLongContractPriceParams = function (item) {
        var infoes = item.WFContractDetailInfoes(),
            firstDetailInfo = infoes != null && infoes.length > 0 ? infoes[0] : null;
        return {
            id: item.WFContractInfoId(),
            code: item.ContractCode(),
            customerId: item.CustomerId(),
            price: firstDetailInfo ? firstDetailInfo.ActualPrice() : 0
        };
    };

    self.onPreSaveSapInfo = function (item) {
        self.currItem = item;
        $('#sapInfoManagementForm .gmk-data-field').val('');
        $('#sapInfoManagementForm').modal('show');
        base._get(options.getSapInfoUrl, { id: item.WFContractInfoId() }, function (data) {
            utils.deserialize('#sapInfoManagementForm .gmk-data-field', data.Data);
        }, false);
    };

    self.onSaveSapInfo = function () {
        base._post(options.saveSapInfoUrl, { id: self.currItem.WFContractInfoId(), data: utils.serialize('#sapInfoManagementForm .gmk-data-field') }, function () {
            $('#sapInfoManagementForm').modal('hide');
        });
    };
};

GMK.LongContract.CreateViewModel = function (commonModels, route, options) {
    var self = this;
    self.commonModels = commonModels;
    var base = GMK.Features.FeatureBase;
    this.internaltionalTradeTypes = $.grep(commonModels.EnumOptions.TradeType, function (item) {
        return item.value != commonModels.Enums.TradeType.Domestic;
    });
    //self.item = ko.mapping.fromJS(route.values.item);
    self.item = new GMK.LongContract.ItemViewModel(route.values.item, commonModels);
    //self.Salers = ko.observableArray();
    //self.accountingEntities = ko.observableArray();
    //self.selectedCommodityId = ko.observable();
    //self.item.CommodityIdSelected.subscribe(function (newVal) {
    //    self.accountingEntities.removeAll();
    //    $.each(commonModels.AllCommodities, function (i, item) {
    //        if (item.id == newVal) {
    //            self.accountingEntities(item.accountEntities.slice(0));
    //            return false;
    //        }
    //    });
    //});
    //self.item.AccountingEntityId.subscribe(function (newVal) {
    //    if (!newVal) self.Salers([]);
    //    else self.Salers($.grep(self.accountingEntities(), function (item) {
    //        return item.id == newVal;
    //    })[0].salers);
    //});
    self.availableBusinessDepartments = ko.computed(function () {
        return $.map($.grep(commonModels.AllCommodities, function (r) {
            return self.item.CommodityIdSelected() === r.id;
        }), function (r) {
            return r.businessDepartments || [];
        });
    });
    self.availableSalers = ko.computed(function () {
        return $.map($.grep(self.availableBusinessDepartments(), function (r) {
            return self.item.DepartmentId() === r.id;
        }), function (r) {
            return r.salers || [];
        });
    });
    self.availableAccountEntities = ko.computed(function () {
        return $.map($.grep(self.availableBusinessDepartments(), function (r) {
            return self.item.DepartmentId() === r.id;
        }), function (r) {
            return r.accountEntities || [];
        });
    });
    self.item.SignDate(route.values.signDate);
    self.initialize = function (callback) {
        if (callback) {
            callback();
        }
    };
    self.onSave = function (formElement) {
        //if ($(formElement).valid()) {
        var plainItem = ko.mapping.toJS(self.item);
        if (plainItem.SpotAmountType) {
            plainItem.WFSettleOption = {
                ExchangeProcessType: plainItem.SpotAmountType,
                OptionType: commonModels.Enums.OptionType.Simple,
                WFSettleOptionDetails: [
                    {
                        WFSettleOptionDetailExchangeProcess: {
                            ExchangeProcessType: plainItem.SpotAmountType,
                        }
                    }
                ],
            };
        }

        if (!plainItem.TradeType) plainItem.TradeType = commonModels.Enums.TradeType.Domestic;
        base._postThenBack(options.saveUrl, plainItem);
        //}
    };
    self.onGenerateCode = function () {
        base._get(options.generateContractCodeUrl, {
            isBuy: self.item.IsBuy(),
            commodityId: self.item.CommodityId(),
            ts: new Date().getTime()
        }, function (result) {
            self.item.ContractCode(result.result);
        });
    };

    self.selectedCorporation = function () {
        return commonModels._findCompany(+route.values.corporationId);
    };
};

GMK.LongContract.EditViewModel = function (commonModels, route, options) {
    var self = this;
    self.commonModels = commonModels;
    var base = GMK.Features.FeatureBase;
    this.internaltionalTradeTypes = $.grep(commonModels.EnumOptions.TradeType, function (item) {
        return item.value != commonModels.Enums.TradeType.Domestic;
    });
    self.id = route.values.id;
    self.item = {};
    self.initialize = function (callback) {
        base._get(options.getUrl, {
            id: self.id
        }, function (result) {
            self.item = new GMK.LongContract.ItemViewModel(result.Data, commonModels);
            //function _getSalers(newVal) {
            //    if (!newVal) return [];
            //    else return $.grep(commonModels.AccountingEntities, function (item) {
            //        return item.id == newVal;
            //    })[0].salers;
            //}
            //self.Salers = ko.observableArray(_getSalers(self.item.AccountingEntityId()));
            //self.item.AccountingEntityId.subscribe(function (newVal) {
            //    self.Salers(_getSalers(newVal));
            //});
            self.availableBusinessDepartments = ko.computed(function () {
                return $.map($.grep(commonModels.AllCommodities, function (r) {
                    return self.item.CommodityIdSelected() === r.id;
                }), function (r) {
                    return r.businessDepartments || [];
                });
            });
            self.availableSalers = ko.computed(function () {
                return $.map($.grep(self.availableBusinessDepartments(), function (r) {
                    return self.item.DepartmentId() === r.id;
                }), function (r) {
                    return r.salers || [];
                });
            });
            self.availableAccountEntities = ko.computed(function () {
                return $.map($.grep(self.availableBusinessDepartments(), function (r) {
                    return self.item.DepartmentId() === r.id;
                }), function (r) {
                    return r.accountEntities || [];
                });
            });
            if ('object' !== typeof self.item.WFLongContract) {
                alert('缺 WFLongContract ');
            }
            callback();
        });
    };
    self.onSave = function () {
        var plainItem = ko.mapping.toJS(self.item);
        if (!plainItem.TradeType) plainItem.TradeType = commonModels.Enums.TradeType.Domestic;
        plainItem.WFSettleOption.ExchangeProcessType = plainItem.SpotAmountType;
        plainItem.WFSettleOption.WFSettleOptionDetails[0].WFSettleOptionDetailExchangeProcess.ExchangeProcessType = plainItem.SpotAmountType;

        base._postThenBack(options.saveUrl, plainItem);
    };
};

GMK.LongContract.LongContractPriceViewModel = function (commonModels, route, options) {
    var self = this;
    //var url = $.url();

    self.commonModels = commonModels;
    var base = GMK.Features.FeatureBase;
    self.marketDataItems = ko.observableArray();
    self.price = ko.observable();
    self.calculatedPrice = ko.observable();

    self.detailId = options.detailId;
    self.priceInfo = {};
    self.priceDetail = {};
    self.avgPrice = {};

    self.editable = ko.observable(false);

    self.initialize = function (callback) {
        base._get(options.getUrl, { detailId: self.detailId }, function (result) {
            if (result.Data.prices) {
                self.marketDataItems(ko.mapping.fromJS(result.Data.prices.SettlementPrice)());
                self.calculatedPrice(utils.round(result.Data.prices.Price, 2));
            }
            if (result.Data.contract)
                self.contract = result.Data.contract;

            self.priceInfo = result.Data.priceInfo;
            self.priceDetail = result.Data.priceDetail;
            self.price(self.priceDetail.FinalPrice);

            self.avgPrice = self.priceDetail.WFAvgPriceDetail;
            self.avgPrice.instrumentCode = getAvgInstrument(self.avgPrice, self.priceDetail);

            self.instruments = commonModels.findInstruments(self.contract.CommodityId);

            if (self.marketDataItems().length >= self.avgPrice.DayCount
                && self.contract.StatusOfContract === self.commonModels.Enums.ContractStatus.Default
               && (self.contract.ApprovalStatus == self.commonModels.Enums.ApprovalStatus.Successed
                || self.contract.ApprovalStatus == null
                || self.contract.ApprovalStatus == self.commonModels.Enums.ApprovalStatus.None)) {
                self.editable(true);
            }

            if (callback) {
                callback();
            }
        });
    };

    function getAvgInstrument(avgPrice, priceDetail) {
        var code = "";
        if (avgPrice && priceDetail.WFPriceInstruments.length > 0) {
            if (!self.commonModels.isForeignExchange(avgPrice.PriceMarket)) {
                var lcdis = priceDetail.WFPriceInstruments;
                if (lcdis.length == 1) {
                    code = self.commonModels.findInstrument(lcdis[0].WFInstrumentId);
                } else {
                    $.each(lcdis, function (i, r) {
                        var startDate = r.StartDate != null ? r.StartDate : (lcdis[i - 1] ? lcdis[i - 1].EndDate : avgPrice.StartTime);
                        var endDate = r.EndDate != null ? r.EndDate : (lcdis[i + 1] ? lcdis[i + 1].StartDate : avgPrice.EndTime);
                        code += utils.formatDate(startDate) + "至" + utils.formatDate(endDate) + "（合约：" + self.commonModels.findInstrument(r.WFInstrumentId) + "）<br />";
                    });
                }
            }
        }
        return code || "暂无";
    }

    self.onSave = function () {
        var msg = "";
        //先把非数字的都替换掉，除了数字和.   
        if (parseFloat(self.calculatedPrice().toString().replace(/[^\d.]/g, "")) == parseFloat(self.price().toString().replace(/[^\d.]/g, ""))) {
            msg = "您填写的价格将会作为最终结算价，确认提交？";           
        } else
            msg = "<strong class='text-danger'>您填写的价格信息与参考价格不一致，此价格将会作为最终结算价。确认提交？</strong>";
        confirm(msg, function () {
            base._post(options.saveUrl, { contractId: self.contract.WFContractInfoId, detailId: self.detailId, price: self.price() }, function (result) {
                Cookies.set('alert-message', '保存成功');
                location.href = options.reloadUrl + '?' + $.param({ detailId: self.detailId });
            });
        });
    };
};
