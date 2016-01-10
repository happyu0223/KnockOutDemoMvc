var GMK = GMK || {};
GMK.FeeRecords = GMK.FeeRecords || {};
GMK.FeeRecords.start = function (route, options) {
    GMK.Features.CommonModels.onReady(function (commonModels) {
        if (options.action === 'Index') {
            commonModels.registerQueryFormEvent();
            var viewModel = new GMK.FeeRecords.IndexViewModel(commonModels, route, options);

            ko.applyBindings(viewModel);
            viewModel.initialize();
        } else if (route.action === 'Manage') {
            commonModels.registerQueryFormEvent();
            var viewModel = new GMK.FeeRecords.FeeRecordViewModel(commonModels, route, options);
            ko.applyBindings(viewModel);
            viewModel.initialize();
        }
    });
};
GMK.FeeRecords.IndexViewModel = function (models, route, options) {
    var self = this;
    self.commonModels = models;
    self.values = options.values;
    var base = GMK.Features.FeatureBase;
    self.items = ko.observableArray();
    self.toquery = ko.mapping.fromJS(options.values.query);
    self.queriedCurrencyId = ko.observable();
    self.query = constructQuery();
    self.pageSummary = ko.computed(function () {
        var summary = {
            amount: 0,
            contractAmount: 0,
            unpaidAmount: 0,
            contractUnpaidAmount: 0
        };
        $.each(self.items(), function (i, r) {
            summary.amount = utils.roundAmount(summary.amount + utils.roundAmount(r.amount));
            summary.contractAmount = utils.roundAmount(summary.contractAmount + utils.roundAmount(r.contractAmount));
            summary.unpaidAmount = utils.roundAmount(summary.unpaidAmount + utils.roundAmount(r.unpaidAmount));
            summary.contractUnpaidAmount = utils.roundAmount(summary.contractUnpaidAmount + utils.roundAmount(r.contractUnpaidAmount));
        });
        return summary;
    });
    self.summary = ko.observable({});
    self.resultSummary = ko.observable();
    self.customers = ko.observableArray();
    self.feeTypes = (function () {
        var result = [], costFeeType = self.commonModels.EnumOptions.CostFeeType;
        $.each(costFeeType, function (i, e) {
            result.push({ name: e.text, id: e.value, isparent: true });
            result[result.length - 1].children = $.grep(self.commonModels.AllFee, function (item) {
                return item.feeType == e.value;
            });
            if (result[result.length - 1].children.length == 1) result[result.length - 1].children = [];
        });
        return result;
    })();
    self.selectedFeeName = ko.observable(' 选择费用类型');
    self.clearFeeType = function () {
        self.selectedFeeName('选择费用类型');
        self.query.feeSysType('');
        self.query.feeSysTypeType('');
        self.customers([]);
    };
    this.findCustomer = function (costFeeType, customerId) {
        switch (costFeeType) {
            case models.Enums.CostFeeType.WarehouseFee:
                return models.findWarehouse(customerId);
            case models.Enums.CostFeeType.Logistics:
                return models.findLogistics(customerId);
            case models.Enums.CostFeeType.Others:
                return models.findCustomer(customerId);
        }
    };

    self.selectFeeType = function (item) {
        var costFeeTypeEnum = models.Enums.CostFeeType, feeType = item.isparent ? item.id : item.feeType;
        self.selectedFeeName(item.name);

        switch (feeType) {
            case costFeeTypeEnum.WarehouseFee:
                self.customers(models._AllWarehouses);
                break;
            case costFeeTypeEnum.Logistics:
                self.customers(models._AllLogistics);
                break;
            case costFeeTypeEnum.Others:
                self.customers(models._AllCustomers);
                break;
        }
        if (item.isparent) {
            self.query.feeSysType('');
            self.query.feeSysTypeType(item.id);
        } else {
            self.query.feeSysType(item.id);
            self.query.feeSysTypeType('');
        }
    };
    function fill(result) {
        var items = result.data.result;
        self.items(items);
        self.summary(result.data.summary);
        base._p(result.data.pagination, route.listUrl, fill, getParameter);
        jQuery.ajaxSettings.traditional = oldV;
    }
    function getParameter() {
        oldV = jQuery.ajaxSettings.traditional;
        jQuery.ajaxSettings.traditional = true;
        var param = ko.mapping.toJS(self.query);
        if (param.commodityIds.length) param.commodityIds = $.grep(param.commodityIds, function (v) {
            return !!v;
        });
        $.extend(param, {
            ContractId: self.toquery.ContractId(),
            CurrencyId: self.toquery.CurrencyId()
        });
        return param;
    }
    var oldV = jQuery.ajaxSettings.traditional;
    self.onSearch = function () {
        var param = getParameter();        
        base._get(route.listUrl, param, function (result) {
            self.queriedCurrencyId(param.CurrencyId);
            fill(result);
        });
    };
    self.onDeleteFeeRecord = function (item) {
        base._delete(route.deleteUrl, { id: item.wfFeeRecordId }, function () {
            self.onSearch();
        });
    };
    if (self.values.isForContract) {
        self.contract = ko.observable();
    }
    self.initialize = function () {
        if (self.values.isForContract) {
            base._get('Contract/GetContractCode', { id: self.values.query.ContractId }, function (result) {
                self.contract({ ContractCode: result.Data });
            });
        }
        self.onSearch();
    };
    function constructQuery() {
        var result = {
            dateRange: ko.observable(),
            commodityIds: ko.observableArray([]),
            feeSysType: ko.observable(),
            feeSysTypeType: ko.observable(),
            customerId: ko.observable()
        };
        //queryMappingOpts = {
        //    include: Object.getOwnPropertyNames(result)
        //};
        return result;
    }
};

GMK.FeeRecords.FeeRecordViewModel = function (models, route, options) {
    var self = this, base = GMK.Features.FeatureBase;
    this.commonModels = models;
    self.item = ko.mapping.fromJS(route.values.newItem);
    this.contractList = ko.observableArray();
    this.contractFees = ko.observableArray();
    this.currentTotalAmount = ko.computed(function () {
        var amount = 0;
        $.each(self.contractFees(), function (i, item) {
            amount += utils.parseFloat(item.amount());
        });
        return utils.formatDecimal(amount, models.settings.decimalDigits);
    });
    this.costFeeType = self.item.wfSystemFeeId;
    this.costFeeType.subscribe(function (newVal) {
        if (newVal != undefined) {
            self.costTypeObj($.grep(models.AllFee, function (item) {
                return item.id == self.costFeeType();
            })[0]);
            return;
        }
        return self.costTypeObj(null);
    });
    this.costTypeObj = ko.observable();
    var oldCostTypeObj;
    this.costTypeObj.subscribe(function (oldValue) {
        oldCostTypeObj = oldValue;
    }, this.costTypeObj, 'beforeChange');
    this.costTypeObj.subscribe(function (newVal) {
        var costTypeObjIsChanging = false, costFeeTypeEnum = models.Enums.CostFeeType;
        if (!oldCostTypeObj && newVal) costTypeObjIsChanging = true;
        else if (oldCostTypeObj && !newVal) costTypeObjIsChanging = true;
        else if (oldCostTypeObj && newVal) costTypeObjIsChanging = oldCostTypeObj.feeType != newVal.feeType;
        if (!costTypeObjIsChanging) return;
        if (!newVal) return self.customers([]);
        switch (newVal.feeType) {
            case costFeeTypeEnum.WarehouseFee:
                self.customers(models._AllWarehouses);
                break;
            case costFeeTypeEnum.Logistics:
                self.customers(models._AllLogistics);
                break;
            case costFeeTypeEnum.Others:
                self.customers(models._AllCustomers);
                break;
        }
    });
    this.customerId = self.item.customerId;
    this.commodityId = self.item.commodityId;
    this.commodityId.subscribe(function () {
        self.contractList.removeAll();
        self.contractFees.removeAll();
    });
    this.customers = ko.observableArray();
    this.feeTypes = ko.observableArray();
    this.systemFeeTypeId = ko.observable();
    this.systemFeeTypeId.subscribe(function (newVal) {
        var feeTypes = $.grep(self.commonModels.AllFee, function (item) {
            return item.feeType == newVal;
        });
        self.feeTypes(feeTypes);
        self.costFeeType(feeTypes.length != 1 ? undefined : feeTypes[0].id);
    });

    function toJS() {
        //var data = utils.serialize('#MainForm .gmk-data-field');
        //var splitting = data.DateRange.split(' - ');
        //data.StartDate = splitting[0];
        //data.EndDate = splitting[1];
        //data.WFContractFees = ko.mapping.toJS(self.contractFees);
        //if (route.values.key) data.WFFeeRecordId = route.values.key;
        //return data;
        var result = ko.mapping.toJS(self.item);
        result.WFContractFees = ko.mapping.toJS(self.contractFees);
        return result;
    }

    this.onSave = function () {
        if (self.contractFees().length) {
            var totalAmount = 0, amount = utils.formatDecimal(utils.parseFloat($('#Amount').val()), models.settings.decimalDigits);
            $.each(self.contractFees(), function (i, item) {
                totalAmount += utils.parseFloat(item.amount());
            });
            totalAmount = utils.formatDecimal(totalAmount, models.settings.decimalDigits);
            if (totalAmount != amount) {
                alert('拆分金额的汇总（{0}）与总金额（{1}）不一致'.format(totalAmount, amount));
                return;
            }
        }
        base._postThenBack(route.saveUrl, toJS());
    };
    this.onRemoveContractFee = function (item) {
        self.contractFees.remove(item);
    };
    this.onLoadSuggestion = function () {
        if (!$('#MainForm').valid()) return;
        //var data = utils.serialize('#MainForm .gmk-data-field');
        base._get(route.loadFeeSplittingSuggestionUrl, {
            FeeSysType: self.item.wfSystemFeeId(),
            CustomerId: self.item.customerId(),
            CommodityId: self.item.commodityId(),
            DateRange: JSON.stringify(self.item.startDate()) + ' - ' + JSON.stringify(self.item.endDate()),
        }, function (result) {
            if (result.data.length == 0) {
                alert('没有拆分方案可用，请检查输入的数据是否有误');
                return;
            }
            self.contractFees($.map(result.data, function (item) {
                return ContractFee(item.contractId, item.customerId, item.contractCode, item.totalAmount);
            }));
        });
    };
    this.onPreselectContract = function (item, event) {
        if (!$('#MainForm').valid()) return;
        $.each(self.contractFees(), function (i, item) {
            $.each(self.contractList(), function (j, elem) {
                if (elem.WFContractInfoId == item.wfContractInfoId) {
                    self.contractList.remove(elem);
                    return false;
                }
            });
        });
        $($(event.currentTarget).attr('href')).modal('show');
    };
    this.onSearchContracts = function () {
        base._get(route.listContractsUrl, utils.serialize('#searchContractsForm .gmk-data-field'), function (result) {
            $.each(self.contractFees(), function (i, item) {
                $.each(result, function (j, elem) {
                    if (elem.WFContractInfoId == item.wfContractInfoId) {
                        result.splice(j, 1);
                        return false;
                    }
                });
            });
            $.each(result, function (i, item) {
                item.isSelected = ko.observable();
            });
            self.contractList(result);
        });
    };
    this.onSelectContracts = function () {
        self.contractFees.push.apply(self.contractFees, $.map($.grep(self.contractList(), function (item) {
            return item.isSelected();
        }), function (elem) {
            return ContractFee(elem.WFContractInfoId, elem.CustomerId, elem.ContractCode);
        }));
    };

    function ContractFee(wfContractInfoId, customerId, contractCode, amount) {
        return {
            wfContractInfoId: wfContractInfoId,
            customerId: customerId,
            contractCode: contractCode,
            amount: ko.observable(amount)
        };
    }

    this.initialize = function () {
        if (route.values.key) {
            base._get(route.loadUrl, { id: route.values.key }, function (result) {
                result.data.dateRange = utils.formatDate(result.data.startDate) + ' - ' + utils.formatDate(result.data.endDate);
                self.systemFeeTypeId(result.data.wfSystemFee.feeType);
                ko.mapping.fromJS(result.data, self.item);
                //utils.deserialize('#MainForm .gmk-data-field', result.data);
                self.contractFees($.map(result.data.wfContractFees, function (item) {
                    return ContractFee(item.wfContractInfoId, item.wfContractInfo.customerId, item.wfContractInfo.contractCode, item.amount);
                }));
            });
        }
    };
}
