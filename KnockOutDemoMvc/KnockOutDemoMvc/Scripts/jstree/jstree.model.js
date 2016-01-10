/**
 * js tree model.
 * init js tree with business.
 * create by amy.bai
 */
var JsTree = JsTree || {};
JsTree.Business = JsTree.Business || {};

JsTree.Business.Model = function (commonModels, treeId, bindModel) {
    var self = this;
    self.bindModel = bindModel;
    self.oldSelectIds = ko.observableArray();
    self.newSelectIds = ko.observableArray();
    self._allNodeIds = ko.observableArray(); //记录所有的jstree的id,用于set disable时判断
    self._allDisableIds = ko.observableArray();
    self._userNodeIds = ko.observableArray();

    self.selectedNodes = ko.observableArray();

    var $treeContainer = $("#" + treeId);
    /**
    * jstree 初始化
    * selectedId 默认初始化时显示的已选项
    * source 初始化制定的源数据 if has use source else default
    */
    self.initialize = function (selectedId, source) {
        var jsTreeData = jsTreeInit(commonModels, source);
        $treeContainer.jstree({
            'core': {
                'data': jsTreeData
            },
            "checkbox": {
                "keep_selected_style": false
            },
            "plugins": ["checkbox"]
        }).bind("loaded.jstree", function (e, data) {
            if (selectedId) {
                self.oldSelectIds(selectedId);
            }
            setDefaultDisable(data); //默认设置不可编辑
            openUserNodes(); //默认展开
        }).bind("select_node.jstree", function (e, data) {
            getSelectedNodes();
        }).bind("deselect_node.jstree", function (e, data) {
            getSelectedNodes();
        });
    };

    self.getSelected = function () {
        var selected = $treeContainer.jstree().get_checked();
        var selectedChildren = $.grep(selected, function (r) {
            return !isNaN(r);
        });
        self.newSelectIds(selectedChildren);
        return selectedChildren;
    };

    self.setSelected = function (newSelectedIds) {
        $treeContainer.jstree("uncheck_all");
        if (!newSelectedIds || newSelectedIds.length == 0) {
            //  $treeContainer.jstree("open_all");
        } else {
            $.each(newSelectedIds, function (i, item) {
                //expandNode(item, $treeContainer);
                $treeContainer.jstree('check_node', item);
            });
        }
    };

    self.setDisable = function (disableIds) {
        var nodes = [];
        $.each(disableIds, function (i, nodeID) {
            nodes.push(nodeID);
            while (nodeID != '#') {
                var thisNode = $treeContainer.jstree("get_node", nodeID);
                nodeID = $treeContainer.jstree("get_parent", thisNode);
                nodes.push(nodeID);
            }
        });
        nodes = nodes.getUnique();
        if (nodes.length > 0) {
            $.each(self._userNodeIds(), function (i, id) {
                if ($.inArray(id, nodes) != -1)
                    $treeContainer.jstree("disable_node", id);
                else
                    $treeContainer.jstree("enable_node", id);
            });
        }
    };

    self.onSave = function (callback) {
        self.getSelected();
        if (callback)
            callback();
    }

    self.onCancel = function (callback) {
        if (callback)
            callback();
    }
    //显示模态框时初始化被选中的数据
    self.onShow = function (newSelectedIds, callback) {
        //$treeContainer.jstree("open_all");
        openUserNodes();
        self.setSelected(newSelectedIds);
        self.oldSelectIds(newSelectedIds);
        getSelectedNodes();
        if (callback)
            callback();
        return true;
    }

    self.onDisable = function (disableIds, callback) {
        self.setDisable(disableIds);
        if (callback)
            callback();
        return true;
    };

    self.onDestroy = function () {
        $treeContainer.jstree('destroy');
    };

    //初始化业务数据
    function jsTreeInit(model, source) {
        var jstreeData = [], allNodeIds = [], disableNodeIds = [], userNodeIds = [];

        var sources = source ? source : model.AllBusinesses;
        var tradeTypes = $.map(sources, function (r) {
            return r.tradeType;
        });

        tradeTypes = unique(tradeTypes);
        $.each(tradeTypes, function (i, tradeType) {
            var tradeTypeList = $.grep(sources, function (r) { return r.tradeType == tradeType });
            var corporations = $.map(tradeTypeList, function (r) {
                return r.corporationId;
            });
            corporations = unique(corporations);

            var tradeTypeTree = {};
            tradeTypeTree.text = model.Enums.SimpleTradeType._Notes[tradeType];
            if (tradeTypeTree.text == "" || tradeTypeTree.text == null) {
                tradeTypeTree.text = model.Enums.FullTradeType._Notes[tradeType];
            }
            tradeTypeTree.id = "tt_" + tradeType;
            tradeTypeTree.children = [];
            allNodeIds.push(tradeTypeTree.id);

            $.each(corporations, function (j, corporation) {
                var corporationList = $.grep(tradeTypeList, function (r) { return r.corporationId == corporation });
                var userCorporations = $.map(commonModels.UserContexts, function (r) {
                    if (r.TradeType == tradeType)
                        return r.CorporationId;
                });
                userCorporations = userCorporations.getUnique();

                var corTree = {};
                corTree.text = model.findCompanyShortName(corporation);
                corTree.id = "tt_" + tradeType + "_cor_" + corporation;
                corTree.children = [];
                tradeTypeTree.children.push(corTree);
                allNodeIds.push(corTree.id);

                var departments = $.map(corporationList, function (r) {
                    return r.departmentId;
                });
                departments = unique(departments);

                $.each(departments, function (k, department) {
                    var departmentTree = {};
                    departmentTree.text = model.findById(model.AllDepartments, department).name;
                    departmentTree.id = "tt_" + tradeType + "_cor_" + corporation + "_dep_" + department;
                    allNodeIds.push(departmentTree.id);
                    departmentTree.children = [];
                    corTree.children.push(departmentTree);

                    var commodityList = $.grep(corporationList, function (r) { return r.departmentId == department });
                    $.each(commodityList, function (l, department) {
                        var commodityTree = {};
                        commodityTree.text = model.findById(model.AllCommodities, department.commodityId).name;
                        commodityTree.id = department.id + '';
                        allNodeIds.push(commodityTree.id);
                        departmentTree.children.push(commodityTree);

                        var userHasBusiness = $.grep(commonModels.UserBusinesses, function (r) {
                            return r.id == department.id;
                        });
                        if (userHasBusiness.length > 0) {
                            userNodeIds.push(corTree.id);
                            userNodeIds.push(tradeTypeTree.id);
                            userNodeIds.push(commodityTree.id);
                            userNodeIds.push(departmentTree.id);
                        } else {
                            disableNodeIds.push(corTree.id);
                            disableNodeIds.push(tradeTypeTree.id);
                            disableNodeIds.push(commodityTree.id);
                            disableNodeIds.push(departmentTree.id);
                        }
                    });
                });
            });

            jstreeData.push(tradeTypeTree);

        });
        self._allNodeIds(allNodeIds);
        self._allDisableIds(disableNodeIds);
        self._userNodeIds(userNodeIds);
        return jstreeData || [];
    }
    function unique(list) {
        var uList = [];
        $.each(list, function (i, item) {
            var eList = $.grep(uList, function (r) { return r == item });
            if (eList.length == 0)
                uList.push(item);
        });
        return uList;
    }

    function expandNode(nodeID, $tree) {
        // Expand all nodes up to the root (the id of the root returns as '#')
        while (nodeID != '#') {
            var thisNode = $tree.jstree("get_node", nodeID);
            if (!thisNode.state.opened && !thisNode.state.disable) {
                $tree.jstree("open_node", nodeID);
            }
            nodeID = $tree.jstree("get_parent", thisNode);
        }
    }

    /* 设置默认不可编辑的内容
    *  根据userContext
    *  根据 贸易类型-公司 往下默认不可编辑设置
    */
    function setDefaultDisable(data) {
        $.each(self._allDisableIds(), function (i, item) {
            if ($.inArray(item, self._userNodeIds()) != -1) {
                self._userNodeIds.remove(item);
            }
            data.instance.disable_node(item);
        });
    }

    function getSelectedNodes() {
        var selected = $.grep($treeContainer.jstree().get_checked(), function (r) {
            return !isNaN(r);
        });
        var nodes = [];
        $.each(selected, function (i, item) {
            nodes.push(commonModels.findById(commonModels.AllBusinesses, parseInt(item)));
        });
        self.selectedNodes(nodes);

        return nodes;
    }

    ///默认展开用户可用的Node
    function openUserNodes() {
        var nodes = $.grep(self._userNodeIds(), function (r) {
            return !isNaN(r);
        });
        $.each(nodes, function (i, item) {
            expandNode(item, $treeContainer);
        });
    }
}