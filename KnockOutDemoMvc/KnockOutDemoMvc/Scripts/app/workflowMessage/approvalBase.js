var GMK = GMK || {};
GMK.WorkflowMessage = GMK.WorkflowMessage || {};

GMK.WorkflowMessage.start = function (route, element, success) {
    GMK.Features.CommonModels.onReady(function (commonModels) {
        var viewModel = new GMK.WorkflowMessage.ApprovalBaseViewModel(commonModels, route, {
            listArchiveUrl: 'Template/ArchiveGet',
            getApprovalCommentsUrl: 'WorkflowMessage/GetApprovalComments',
            getFlowchartUrl: 'WorkflowMessage/GetFlowchart',
            getOperationLogsUrl: 'WorkflowMessage/GetOperationLogs',
            listUrl: route.listUrl,
            downloadFileUrl: route.downloadFileUrl,
            openFileUrl: route.openFileUrl,
            baseWorkflowMessageUrl: route.baseWorkflowMessageUrl,
            getCreditRiskUrl: 'CreditRisk/CheckRisk'
        });
        window.vm = viewModel;
        viewModel.initialize(function () {
            ko.applyBindings(viewModel, element);
            $('#approval-form .is-pdf').each(function (i) {
                var $this = $(this);
                PDFView.open($this.attr('href'), 0, null, null, null, $this.next()[0]);
            });
            if (success) {
                success(viewModel);
            }
        });
    });
};

GMK.WorkflowMessage.ApprovalBaseViewModel = function (commonModels, route, actions) {
    var self = this, base = GMK.Features.FeatureBase;

    self.tabName = ko.observable();
    self.tabName.subscribe(function (newValue) {
        if (route.values.actionName !== 'Print') {
        var params = $.extend({}, $.url().param(), { tab: newValue.slice(10) });
        var newUrl = location.pathname + '?' + $.param(params) + location.hash;
            History.replaceState(null, null, newUrl);
        }
        if (newValue === '#approval-flowchart') {
            self.onShowFlowchart();
        } else if (newValue === '#approval-log') {
            self.onShowOperationLogs();
        } else if (newValue === '#attachments') {
            self.onShowAttachments();
        }
    });
    self.onSelectTab = function (d, e) {
        var tabName = $(e.target).data('target') || $(e.target).attr('href') || '#approval-form';
        self.tabName(tabName);
    };
    self.archiveContent = ko.observable();
    self.attachments = ko.observableArray();
    self.mainAttachments = ko.observableArray();

    self.onLoadApplicationData = function (callback) {
        if (route.values.itemContentType === commonModels.Enums.ContentType.AutoGenerate || route.values.itemContentType === commonModels.Enums.ContentType.BlankTemplate) {
            base._get(actions.listArchiveUrl, {
                templateType: route.values.templateType,
                dataSourceId: route.values.objectId
            }, function (result) {
                if (result.Data) self.archiveContent(result.Data.BillContent);
                callback();
            });
        } else if (route.values.itemContentType === commonModels.Enums.ContentType.Attachment) {
            var old = $.ajaxSettings.traditional;
            $.ajaxSettings.traditional = true;
            base._get('Attachment/ListAttachmentFileByIds', {
                ids: route.values.mainContentAttachmentFileIds
            }, function (result) {
                var attachments = $.map(result.Data, function (r) {
                    return new GMK.Attachment.AttachmentFileViewModel(r, r.WFContractBillArchive, actions);
                });
                self.mainAttachments(attachments);
                callback();
            });
            $.ajaxSettings.traditional = false;
        } else {
            callback();
        }
    }
    self.values = route.values;
    self.commonModels = commonModels;
    self.note = ko.observable(route.values.item.Note);
    self.taskContent = ko.observable();
    var IsComputingRisk = '计算潜在风险中...';
    var noRisk = '无潜在风险';
    self.riskMessage = ko.observable(IsComputingRisk);
    self.risks = ko.observableArray();
    self.showRisk = ko.observable();
    self.isRisk = ko.observable();
    self.isWarning = ko.observable();
    self.approvalComments = ko.observableArray();
    self.operationLogs = ko.observableArray();
    self.flowchartData = null;
    self.item = ko.observable();
    self.message = ko.observable();
    self.printable = ko.computed(function () {
        return route.values.approvalStatus === commonModels.Enums.ApprovalStatus.Successed;
    });
    self.onShowFlowchart = function () {
        if (self.flowchartData) return;
        base._get(actions.getFlowchartUrl, { flowId: route.values.flowId }, function (result) {
            self.flowchartData = {
                data: result.data
            };
            $('#flowchart-container').flowchart(self.flowchartData);
        });
    };
    self.onShowAttachments = function () {
        if (self.attachments().length) return;
        var old = $.ajaxSettings.traditional;
        $.ajaxSettings.traditional = true;
        base._get('Attachment/ListAttachmentFileByIds', {
            ids: route.values.attachmentFileIds
        }, function (result) {
            var attachments = $.map(result.Data, function (r) {
                return new GMK.Attachment.AttachmentFileViewModel(r, r.WFContractBillArchive);
            });
            self.attachments(attachments);
            $('#attachments .is-pdf').each(function (i) {
                var $this = $(this);
                PDFView.open($this.attr('href'), 0, null, null, null, $this.next()[0]);
            });
        });
        $.ajaxSettings.traditional = old;
    };
    self.loadOperationLogs = function (callback) {
        base._get(actions.getOperationLogsUrl, { flowId: route.values.flowId }, function (result) {
            self.operationLogs(result.data);
            if (callback) {
                callback();
            }
        });
    }
    self.onShowOperationLogs = function () {
        if (!self.operationLogs().length) {
            self.loadOperationLogs();
        }
    };
    self.onSave = function () {
        base._post('WorkflowMessage/TaskUpdate', {
            id: route.values.id,
            note: self.note()
        });
    };
    var approvalContinueToNextKey = 'approval_continue_to_next' + userName, nextUrl;
    self.onContinueToNext = function () {
        store.set(approvalContinueToNextKey, $('#approvalContinueToNext').prop('checked'));
        window.location.href = nextUrl;
    };
    self.onAgree = function () {
        var validator = $('#form-note').validate();
        validator.resetForm();
        $('#form-note .control-group').removeClass(validator.settings.errorClass);
        _doAction('确定要同意？', true);
    };
    self.onDisagree = function () {
        _doAction('确定要拒绝？', false);
    };
    function _doAction(msg, approval) {
        if (self.riskMessage() == IsComputingRisk) {
            msg = '正在计算潜在风险，' + msg;
        }
        confirm(msg, function () {
            base._post('WorkflowMessage/TaskSolve', {
                approval: approval,
                flowId: route.values.flowId,
                stepId: route.values.stepId,
                taskId: route.values.id,
                note: self.note()
            }, function (result) {
                window.location.href = result.Data || actions.listUrl;
            });
        });
    }
    self.onCancel = function () {
        confirm('确定要撤销？', function () {
            base._post('WorkflowMessage/RequestCancel', {
                flowId: route.values.flowId,
                note: self.note()
            }, function (result) {
                location.reload(true);
            });
        });
    };
    self.onManualFinish = function () {
        confirm('确定要终止审批？', function () {
            base._post('WorkflowMessage/RequestManualFinishApproval', {
                flowId: route.values.flowId,
                note: self.note()
            }, function (result) {
                location.reload(true);
            });
        });
    }
    self.onSkipCeoApproval = function () {
        confirm('确定要跳过总裁审批？', function () {
            base._post('WorkflowMessage/SkipCeoApproval', {
                flowId: route.values.flowId,
                note: self.note()
            }, function (result) {
                location.reload(true);
            });
        });
    }
    self.onRedirectApprovalToCeo = function () {
        confirm('确定要将审批强行流转至总裁？', function () {
            base._post('WorkflowMessage/RedirectApprovalToCeo', {
                flowId: route.values.flowId
            }, function (result) {
                location.reload(true);
            });
        });
    }
    self.initialize = function (callback) {
        var paramTab = $.url().param('tab'), tabName;
        switch (paramTab) {
            case 'form':
                tabName = '#approval-form';
                break;
            case 'comments':
                tabName = '#approval-comments';
                break;
            case 'flowchart':
                tabName = '#approval-flowchart';
                break;
            case 'log':
                tabName = '#approval-log';
                break;
            case 'print':
                tabName = self.printable() ? '#approval-print' : '#approval-form';
                break;
            default:
                tabName = '#approval-form';
                break;
        }
        if (route.values.actionName !== 'Print') {
            History.replaceState(null, null, route.baseWorkflowMessageUrl + '/' + route.values.actionName + '/' + route.values.id + '?' + $.param({ tab: tabName.slice(10) }));
        }
        var newCallBack = function () {
            if (callback) {
                callback();
            }
            if (route.values.flowType == commonModels.Enums.ApprovalType.Contract) {
                self.showRisk(true);
                base._get(actions.getCreditRiskUrl, { contractId: route.values.objectId, workflowId: route.values.flowId }, function (result) {
                    var infoes, potentialRiskCategoryEnum;
                    if (result.Data) {
                        potentialRiskCategoryEnum = commonModels.Enums.PotentialRiskCategory, len = result.Data.length;
                        infoes = $.grep(result.Data, function (risk) {
                            return !risk.type;
                        });
                        result.Data = $.grep(result.Data, function (risk) {
                            return !!risk.type;
                        });
                        result.Data = result.Data.sort(function (a, b) {
                            if (a.type > b.type) return 1;
                            else if (a.type < b.type) return -1;
                            else return 0;
                        });
                        self.isRisk($.grep(result.Data, function (risk) { return risk.type < potentialRiskCategoryEnum.TotalAmountDailyWarning; }).length > 0);
                        if (!self.isRisk()) self.isWarning($.grep(result.Data, function (risk) { return risk.type >= potentialRiskCategoryEnum.TotalAmountDailyWarning; }).length > 0);
                        else self.isWarning(false);
                    }
                    self.riskMessage(result.Data && result.Data.length ? '' : noRisk);
                    if (infoes && infoes.length) result.Data.push.apply(result.Data, infoes);
                    self.risks(result.Data);
                });
                $('#page-spinner').hide();
            } else {
                self.riskMessage('');
            }
            if (route.values.category === 'Message' && !self.item().IsRead()) {
                window.setTimeout(self.messageSetRead, 1000);
            }
            $('.nav-tabs a[href="' + tabName + '"]').tab('show');
            self.tabName(tabName);
        };
        self.item(ko.mapping.fromJS(route.values.item));

        if (route.values.actionName === 'Print') {
            self.loadTaskContent();
        }
        if (route.values.messageType === commonModels.Enums.MessageType.Approval && route.values.flowId !== null) {
            self.onLoadApplicationData(function () {
                self.loadOperationLogs(function () {
                    self.loadComments(newCallBack);
                });
            });
        } else {
            newCallBack();
        }
    };
    self.messageSetRead = function () {
        base._post('WorkflowMessage/MessageSetReadById', { id: route.values.id }, function (result) {
            self.item().IsRead(true);
        });
    };
    self.loadComments = function (callback) {
        base._get(actions.getApprovalCommentsUrl, { flowId: route.values.flowId }, function (result) {
            self.approvalComments(result.data);
            if (callback) {
                callback();
            }
        });
    };
    self.loadTaskContent = function (callback) {
        base._get('WorkflowMessage/GetTaskContent', { flowId: route.values.flowId }, function (result) {
            var taskContent;
            try {
                taskContent = JSON.parse(result.Data);
            } catch (e) {
                taskContent = result.Data || '';
            }
            self.taskContent(taskContent);
        });
    };
    self.taskAdjacency = function (options) {
        if (route.values.actionName === 'Task' || route.values.actionName === 'MessageDetails') {
            var url = 'WorkflowMessage/TaskAdjacency';
            if (route.values.actionName === 'MessageDetails') url = 'WorkflowMessage/MessageAdjacency';
            base._get(url, {
                id: route.values.id,
                isNext: options.isNext
            }, function (result) {
                if (result.Data.exists) {
                    location.href = result.Data.url;
                } else {
                    alert(options.isNext ? '已位于最后一项' : '已位于第一项');
                }
            });
        }
    };
    self.onTaskPrev = function () {
        self.taskAdjacency({ isNext: false });
    };
    self.onTaskNext = function () {
        self.taskAdjacency({ isNext: true });
    };

    self.dailyContracts = ko.observableArray();
    self.currContract = {
        contractCode: ko.observable(),
        customerId: ko.observable(),
        commodityId: ko.observable(),
        amount:ko.observable()
    };
    self.dailyContractSummary = {
        count: ko.observable(),
        totalAmount : ko.observable()
    };
    self.loadDailyContract = ko.observable(false);

    self.onShowDailyContracts = function () {
        if (self.dailyContracts().length == 0) { //避免时刻动态加载
            base._get('CreditRisk/GetDailyContracts', { workflowId: route.values.flowId }, function (result) {
                self.dailyContracts(result.Data.data.Contracts);
                var curContract = result.Data.data.CurrentContract;
                self.currContract.contractCode(curContract.ContractCode);
                self.currContract.customerId(curContract.CustomerId);
                self.currContract.commodityId(curContract.CommodityId);
                self.currContract.amount(curContract.ContractAmount);
                self.dailyContractSummary.count(result.Data.data.Count);
                self.dailyContractSummary.totalAmount(result.Data.data.TotalAmount);

                self.loadDailyContract(true);
            });
        }
    };
};
