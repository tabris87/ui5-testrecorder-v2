sap.ui.define([
    "sap/ui/base/Object",
    "com/ui5/testing/model/code-generation/opa5/PageBuilder",
    "com/ui5/testing/model/code-generation/opa5/ParentMatcherBuilder",
    "com/ui5/testing/model/code-generation/opa5/ItemBindingMatcherBuilder",
    "com/ui5/testing/model/Utils",
    "com/ui5/testing/util/ItemConstants",
    "com/ui5/testing/util/StringBuilder"
], function (UI5Object, PageBuilder, ParentMatcherBuilder, ItemBindingMatcherBuilder, Utils, ItemConstants, StringBuilder) {
    "use strict";
    var OPA5CodeStrategy = UI5Object.extend("com.ui5.testing.model.code-generation.OPA5CodeStrategy", {
        jsonKeyRegex: /\"(\w+)\"\:/g,
        /**
         *
         */
        constructor: function () {
            this.__pages = {};
            this.__code = {
                type: "CODE",
                order: 1,
                content: [],
                constants: []
            };
            this.__customMatcher = {};
        }
    });

    OPA5CodeStrategy.prototype.generate = function (oCodeSettings, aElements, codeHelper) {
        var aCodes = [];
        //setup page builder for each view used during the test
        /* aElements
            .map(el => ({
                viewName: el.item.viewProperty.localViewName ? el.item.viewProperty.localViewName : "Detached",
                namespace: el.item.viewProperty.viewName ? el.item.viewProperty.viewName.replace('.view.' + el.item.viewProperty.localViewName, '') : '<template>'
            }))
            .reduce((a, b) => a.every(c => b.viewName !== c.viewName) ? a.concat(b) : a, [])
            .forEach(el => this.__pages[el.viewName] = (new PageBuilder(el.namespace, el.viewName))); */

        this.__namespace = this.__pages[Object.keys(this.__pages)[0]] ? this.__pages[Object.keys(this.__pages)[0]].getNamespace() : 'mock.namespace';

        //(2) execute script
        this.__code.codeName = oCodeSettings.testName;

        this._setupHeader();

        this.__createConstants(aElements);

        this.__code.content.push((new StringBuilder()).addNewLine().addTab().add('QUnit.module("').add(oCodeSettings.testCategory).add('");').addNewLine(2).toString());

        this.__createAppStartStep(oCodeSettings);

        this.__createTestSteps(oCodeSettings, aElements);

        this.__createAppCloseStep();

        this.__code.content.push('});');

        this.__code.code = this.__code.content.reduce((a, b) => a + b, '');

        aCodes.push(this.__code);

        var order = 1;
        var namespace = [...new Set(Object.values(this.__pages).map(el => el.getNamespace()))].filter(nsp => nsp !== '<template>')[0];
        namespace = namespace ? namespace : '<template>';
        Object.keys(this.__pages).forEach(function (key) {
            if (this.__pages[key].getNamespace() === '<template>') {
                this.__pages[key].setNamespace(namespace);
            }
            order = order++;
            var oCode = {
                codeName: key + 'Page',
                type: 'CODE',
                order: order,
                code: this.__pages[key].generate()
            };
            aCodes.push(oCode);
        }.bind(this));

        Object.keys(this.__customMatcher).forEach(function (key) {
            order = order++;
            var oCode = {
                codeName: this.__capitalize(key) + 'Matcher',
                type: 'CODE',
                order: order,
                code: this.__customMatcher[key].generate()
            };
            aCodes.push(oCode);
        }.bind(this));

        aCodes.push({

            codeName: 'Common',
            type: 'CODE',
            order: order++,
            code: this.__generateCommonPage()
        });

        return aCodes;
    };

    OPA5CodeStrategy.prototype._setupHeader = function () {
        var oCode = new StringBuilder('sap.ui.define([');
        oCode.addNewLine()
            .addTab()
            .add('"sap/ui/test/Opa5",')
            .addNewLine()
            .addTab()
            .add('"sap/ui/test/opaQunit"')
            .addNewLine()
            .add('], function (Opa5, opaTest) {')
            .addNewLine()
            .addTab().add('"use strict";')
            .addNewLine();
        this.__code.content.push(oCode.toString());
    };

    OPA5CodeStrategy.prototype.__createConstants = function (aElements) {
        aElements.forEach(function (el) {
            for (var sK in el.selector.selectorUI5) {
                var properties = el.selector.selectorUI5[sK];
                for (var sPK in properties.properties) {
                    var sValue = typeof Object.values(properties.properties[sPK])[0] === "string" ? Object.values(properties.properties[sPK])[0].trim() : Object.values(properties.properties[sPK])[0];
                    var constant = this.__code.constants.filter(c => c.value === sValue)[0];
                    if (constant) {
                        properties.properties[sPK]['constant'] = constant.symbol;
                    } else {
                        var newConstant = this.__createConstant(sValue);
                        this.__code.constants.push(newConstant);
                        properties.properties[sPK]['constant'] = newConstant.symbol;
                    }
                }
            }
        }.bind(this));
        if (this.__code.constants.length > 0) {
            var constants = Array(2).join('\t') +
                'var' +
                this.__code.constants
                .map(c => Array(3).join('\t') + c.symbol + ' = \"' + c.value + '\"')
                .reduce((a, b) => a + ',\n' + b, '')
                .substring(2) +
                ';';
            this.__code.content.push(constants.replace(/var\t{2}/g, 'var ') + '\n');
        }
    };

    OPA5CodeStrategy.prototype.__createConstant = function (sString) {
        var constant = {
            value: sString
        };
        constant.symbol = typeof sString === "string" ? 'C_' + sString.replace(/[\s\-\.\:\/\%]+/g, '_') : 'C_' + JSON.stringify(sString);
        //check for ÜÄÖ
        constant.symbol = constant.symbol.replace(/[äÄ]+/g, 'ae');
        constant.symbol = constant.symbol.replace(/[öÖ]+/g, 'oe');
        constant.symbol = constant.symbol.replace(/[üÜ]+/g, 'ue');

        constant.symbol = constant.symbol.toUpperCase();
        return constant;
    };

    OPA5CodeStrategy.prototype.__createAppStartStep = function (oAppDetails) {
        var oStartStep = new StringBuilder();
        oStartStep.addTab().add('opaTest("').add(oAppDetails.testName).add('", function(Given, When, Then) {').addNewLine();
        var sNavHash = "";
        if (oAppDetails.testUrl.indexOf('#') > -1) {
            sNavHash = oAppDetails.testUrl.substring(oAppDetails.testUrl.indexOf('#') + 1);
        }
        oStartStep.addTab(2).add('Given.iStartTheAppByHash({hash: \"').add(sNavHash).add('\"});').addNewLine(2);

        this.__code.content.push(oStartStep.toString());
    };

    OPA5CodeStrategy.prototype.__createAppCloseStep = function () {
        var oCloseStep = new StringBuilder();
        oCloseStep.addNewLine().addTab(2).add('Given.iTeardownTheApp();').addNewLine().addTab().add('});').addNewLine();
        this.__code.content.push(oCloseStep.toString());
    };

    OPA5CodeStrategy.prototype.__createTestSteps = function (oCodeSettings, aTestSteps) {
        var oSteps = new StringBuilder();
        //from here starts the real testing
        for (var step in aTestSteps) {
            var stepCode = this.createTestStep(oCodeSettings, aTestSteps[step]);
            if (stepCode) {
                oSteps.add(stepCode);
            }
        }
        this.__code.content.push(oSteps.toString());
    };

    OPA5CodeStrategy.prototype.createTestStep = function (oCodeSettings, oTestStep) {
        var viewName = oTestStep.item.viewProperty.localViewName ? oTestStep.item.viewProperty.localViewName : "Detached";
        var namespace = '<template>';
        if (oTestStep.item.viewProperty.viewName) {
            namespace = oTestStep.item.viewProperty.viewName.replace('.view.' + oTestStep.item.viewProperty.localViewName, '');
        }

        if (!this.__pages[viewName]) {
            this.__pages[viewName] = new PageBuilder(namespace, viewName);
        }

        //check if a parent attribute is requested, therefore add the dependencies to the page
        var aMatching = [...oTestStep.attributeFilter, ...oTestStep.assertFilter];
        var aResults = aMatching.filter(filter => filter.attributeType.indexOf('PRT') > -1);
        if (aResults.length > 0) {
            if (!this.__customMatcher.parent) {
                this.__pages[viewName].setCustomMatcher('parent', true);
                this.__customMatcher.parent = new ParentMatcherBuilder(namespace);
            }
        }

        if (aMatching.some(a => a.criteriaType === 'BDG' || a.attributeType.indexOf('BDG') > -1)) {
            if (!this.__customMatcher.itemBinding) {
                this.__pages[viewName].setCustomMatcher('itemBinding', true);
                this.__customMatcher.itemBinding = new ItemBindingMatcherBuilder(namespace);
            }
        }
        switch (oTestStep.property.type) {
            case "ACT":
                return this.__createActionStep(oTestStep, oCodeSettings) + '\n';
            case "ASS":
                return this.__createExistStep(oTestStep, oCodeSettings) + '\n';
            default:
                return;
        }
    };

    OPA5CodeStrategy.prototype.__createActionStep = function (oStep, oCodeSettings) {
        var actionsType = oStep.property.actKey;
        switch (actionsType) {
            case 'TYP':
                return this.__createEnterTextAction(oStep, oCodeSettings);
            case 'PRS':
                return this.__createPressAction(oStep, oCodeSettings);
            default:
                //console.log('Found a unknown action type: ' + actionsType);
                return "";
        }
    };

    OPA5CodeStrategy.prototype.__flattenProperties = function (aObjects) {
        var tempArray = [];
        if (typeof aObjects === 'object') {
            if (!Array.isArray(aObjects)) {
                if (Object.keys(aObjects).length === 1) {
                    tempArray = [aObjects];
                } else {
                    for (var key in aObjects) {
                        tempArray = [...tempArray, ...this.__flattenProperties(aObjects[key])];
                    }
                }
            } else {
                for (var i = 0; i < aObjects.length; i++) {
                    tempArray = [...tempArray, ...this.__flattenProperties(aObjects[i])];
                }
            }
        }
        return tempArray;
    };

    OPA5CodeStrategy.prototype.__createSelectorProperties = function (aSelectors) {
        var endObject = {};
        for (var key in aSelectors) {
            switch (key) {
                case 'id':
                    endObject[key] = {
                        value: aSelectors[key].id,
                        isRegex: aSelectors[key].__isRegex
                    };
                    break;
                case 'properties':

                    var newProperties = this.__flattenProperties(aSelectors[key].reduce(
                        function (obj, item) {
                            obj[Object.keys(item)[0]] = Object.values(item)[0];
                            return obj;
                        }, {}));
                    newProperties = this.__flattenProperties(newProperties);
                    endObject['attributes'] ? endObject['attributes'] = [...endObject['attributes'], ...newProperties] :
                        endObject['attributes'] = newProperties;
                    break;
                default:
                    endObject[key] = aSelectors[key];
            }
        }

        var sSelectorParts = JSON.stringify(endObject);
        let m;
        let repl = {};

        while ((m = this.jsonKeyRegex.exec(sSelectorParts)) !== null) {
            repl[m[1]] = m[0];
        }
        Object.keys(repl).forEach(key => {
            sSelectorParts = sSelectorParts.replace(repl[key], key + ': ');
        });
        return sSelectorParts;
    };

    OPA5CodeStrategy.prototype.__createEnterTextAction = function (oStep, oCodeSettings) {
        var viewName = oStep.item.viewProperty.localViewName ? oStep.item.viewProperty.localViewName : "Detached";
        this.__pages[viewName].addEnterTextFunction();

        var oEnterTextAction = new StringBuilder();
        oEnterTextAction.addTab(2).add('When.on').add(viewName).add('.enterText({')
        //var aParts = [Array(3).join('\t') + 'When.'];
        //aParts.push('on' + viewName);
        //aParts.push('.enterText(');
        //aParts.push('{');
        this.__createObjectMatcherInfos(oStep, oEnterTextAction, oCodeSettings);
        oEnterTextAction.add(', actionText: "').add(oStep.property.selectActInsert).add('"').add('});');

        return oEnterTextAction.toString();
    };

    OPA5CodeStrategy.prototype.__createPressAction = function (oStep, oCodeSettings) {
        var viewName = oStep.item.viewProperty.localViewName ? oStep.item.viewProperty.localViewName : "Detached";
        this.__pages[viewName].addPressFunction();

        var oPressAction = new StringBuilder();
        oPressAction.addTab(2).add("When.on").add(viewName).add('.press({');
        //var aParts = [Array(3).join('\t') + 'When.'];
        //aParts.push('on' + viewName);
        //aParts.push('.press(');
        //aParts.push('{');
        if (oStep.property.selectItemBy === "UI5") {
            oPressAction.add('id: {value: "').add(oStep.selector.selectorUI5.own.id).add('",isRegex: true}');
        } else {
            this.__createObjectMatcherInfos(oStep, oPressAction, oCodeSettings);
        }

        oPressAction.add('});');
        return oPressAction.toString();

    };

    OPA5CodeStrategy.prototype.__createExistStep = function (oStep, oCodeSettings) {
        var viewName = oStep.item.viewProperty.localViewName ? oStep.item.viewProperty.localViewName : "Detached";
        if (oStep.assertFilter && oStep.assertFilter.some(a => a.criteriaType === 'AGG')) {
            return this.__createAggregationCheck(oStep, oCodeSettings);
        } else {
            this.__pages[viewName].addExistFunction();
            var oExistAssert = new StringBuilder();
            oExistAssert.addTab(2).add('Then.on').add(viewName).add('.iShouldSeeTheControl({');

            //var aParts = [Array(3).join('\t') + 'Then.'];
            //aParts.push('on' + viewName);
            //aParts.push('.iShouldSeeTheControl(');
            //aParts.push('{');

            this.__createObjectMatcherInfos(oStep, oExistAssert, oCodeSettings);
            oExistAssert.add('});');

            return oExistAssert.toString();
        }
    };

    OPA5CodeStrategy.prototype.__createObjectMatcherInfos = function (oStep, oSB, oCodeSettings) {
        var objectMatcher = {};
        var parentMatcher = {};
        var aToken = [...oStep.attributeFilter, ...oStep.assertFilter];
        for (var id in aToken) {
            if (aToken[id].attributeType !== "OWN") {
                if (!parentMatcher[aToken[id].attributeType]) {
                    parentMatcher[aToken[id].attributeType] = {};
                }
            }
            switch (aToken[id].criteriaType) {
                case 'ID':
                    if (aToken[id].attributeType === 'OWN') {
                        objectMatcher['ID'] = 'id: {value: "' + aToken[id].criteriaValue + '",isRegex: false}';
                    } else {
                        parentMatcher[aToken[id].attributeType]['ID'] = 'id: {value: "' + aToken[id].criteriaValue + '", isRegex: false}';
                    }
                    break;
                case ItemConstants.ATTRIBUTE:
                    if (aToken[id].attributeType === 'OWN') {
                        this.__createAttrValue(aToken[id], objectMatcher);
                    } else {
                        this.__createAttrValue(aToken[id], parentMatcher[aToken[id].attributeType]);
                    }
                    break;
                case ItemConstants.METADATA:
                    if (aToken[id].attributeType === 'OWN') {
                        objectMatcher['OBJ_CLASS'] = 'controlType: \"' + aToken[id].criteriaValue + '\"';
                    } else {
                        parentMatcher[aToken[id].attributeType]['OBJ_CLASS'] = 'controlType: \"' + aToken[id].criteriaValue + '\"';
                    }
                    break;
                case ItemConstants.BINDING:
                    if (aToken[id].attributeType === 'OWN') {
                        if (oStep.attributeFilter[id].criteriaValue.indexOf('i18n>') > -1 && this._versionGE(oCodeSettings.ui5Version, "1.42")) {
                            if (!objectMatcher[ItemConstants.I18N]) {
                                objectMatcher[ItemConstants.I18N] = [];
                            }
                            objectMatcher[ItemConstants.I18N].push('{key: \"' + aToken[id].criteriaValue.substring(aToken[id].criteriaValue.indexOf('>') + 1) + '\", propertyName: \"' + aToken[id].subCriteriaType + '\"}');
                        } else {
                            if (!objectMatcher[ItemConstants.BINDING]) {
                                objectMatcher[ItemConstants.BINDING] = [];
                            }
                            var aBindingParts = aToken[id].criteriaValue.split('>');
                            var sModelName = aBindingParts[0] ? aBindingParts[0] : "undefined";
                            var sPathName = aBindingParts[1] && aBindingParts[1].startsWith('/') ? aBindingParts[1] : "";
                            var sPropertyPath = aBindingParts[1] && !aBindingParts[1].startsWith('/') ? aBindingParts[1] : "";
                            var aMatchProperties = [];
                            aMatchProperties.push('{property: "');
                            aMatchProperties.push(aToken[id].subCriteriaType);
                            aMatchProperties.push('"');
                            if (sModelName !== "") {
                                aMatchProperties.push(`, modelName: "${sModelName}"`);
                            }
                            if (sPathName !== "") {
                                aMatchProperties.push(`, path: "${sPathName}"`);
                            }
                            if (sPropertyPath !== "") {
                                aMatchProperties.push(`, propertyPath: "${sPropertyPath}"`);
                            }
                            aMatchProperties.push('}');
                            objectMatcher[ItemConstants.BINDING].push(aMatchProperties.reduce((a, b) => a + '' + b, ''));
                        }
                    } else {
                        // eslint-disable-next-line no-lonely-if
                        if (oStep.attributeFilter[id].criteriaValue.indexOf('i18n>') > -1 && this._versionGE(oCodeSettings.ui5Version, "1.42")) {
                            if (!parentMatcher[aToken[id].attributeType][ItemConstants.I18N]) {
                                parentMatcher[aToken[id].attributeType][ItemConstants.I18N] = [];
                            }
                            parentMatcher[aToken[id].attributeType][ItemConstants.I18N].push('{key: \"' + aToken[id].criteriaValue.substring(aToken[id].criteriaValue.indexOf('>') + 1) + '\", propertyName: \"' + aToken[id].subCriteriaType + '\"}');
                        } else {
                            if (!parentMatcher[aToken[id].attributeType][ItemConstants.BINDING]) {
                                parentMatcher[aToken[id].attributeType][ItemConstants.BINDING] = [];
                            }
                            parentMatcher[aToken[id].attributeType][ItemConstants.BINDING].push('binding: {property: \"' + aToken[id].subCriteriaType + '\", path: \"' + oStep.attributeFilter[id].criteriaValue + '\"}');
                        }
                    }
                    break;
                case 'AGG':
                    break; //need to be because this are no relevant object infos
                default:
                    //console.log('Found a unknown class: ' + aToken[id].criteriaType);
            }
        }
        for (var k in objectMatcher) {
            if (k !== ItemConstants.ATTRIBUTE && k !== ItemConstants.BINDING && k !== ItemConstants.I18N) {
                oSB.add(objectMatcher[k]).add(', ');
            }
        }
        oSB.replace(/,\s*$/, '');
        //aParts[aParts.length - 1] = aParts[aParts.length - 1].replace(/,\s*$/, '');

        if (objectMatcher[ItemConstants.ATTRIBUTE]) {
            objectMatcher[ItemConstants.ATTRIBUTE] = [...new Set(objectMatcher[ItemConstants.ATTRIBUTE])];
            oSB.add(", attributes: [").addMultiple(objectMatcher[ItemConstants.ATTRIBUTE], ', ').add("]");
        }

        if (objectMatcher[ItemConstants.BINDING]) {
            objectMatcher[ItemConstants.BINDING] = [...new Set(objectMatcher[ItemConstants.BINDING])];
            oSB.add(", binding: [").addMultiple(objectMatcher[ItemConstants.BINDING], ', ').add("]");
        }

        if (objectMatcher[ItemConstants.I18N]) {
            objectMatcher[ItemConstants.I18N] = [...new Set(objectMatcher[ItemConstants.I18N])];
            oSB.add(", i18n: [").addMultiple(objectMatcher[ItemConstants.I18N], ', ').add("]");
        }

        if (Object.keys(parentMatcher).length > 0) {
            oSB.add(", parent: [");
            for (var key in parentMatcher) {
                oSB.add("{");
                for (var attrK in parentMatcher[key]) {
                    if (attrK !== ItemConstants.ATTRIBUTE && attrK !== ItemConstants.BINDING && attrK !== ItemConstants.I18N) {
                        oSB.add(parentMatcher[key][attrK]).add(', ');
                    }
                }

                if (key === 'PRT') {
                    oSB.add('levelAbove: 1');
                } else {
                    oSB.add('levelAbove: ').add(key.replace('PRT', ''));
                }

                if (parentMatcher[key][ItemConstants.ATTRIBUTE]) {
                    parentMatcher[key][ItemConstants.ATTRIBUTE] = [...new Set(parentMatcher[key][ItemConstants.ATTRIBUTE])];
                    oSB.add(", attributes: [").addMultiple(parentMatcher[key][ItemConstants.ATTRIBUTE]).add("]");
                }

                if (parentMatcher[key][ItemConstants.BINDING]) {
                    parentMatcher[key][ItemConstants.BINDING] = [...new Set(parentMatcher[key][ItemConstants.BINDING])];
                    oSB.add(", binding: [").addMultiple(parentMatcher[key][ItemConstants.BINDING]).add("]");
                }

                if (parentMatcher[key][ItemConstants.I18N]) {
                    parentMatcher[key][ItemConstants.I18N] = [...new Set(parentMatcher[key][ItemConstants.I18N])];
                    oSB.add(", i18n: [").addMultiple(parentMatcher[key][ItemConstants.I18N]).add("]");
                }
                oSB.add('}, ');
            }
            oSB.replace(/,\s*$/, '');
            //aParts[aParts.length - 1] = aParts[aParts.length - 1].replace(/,\s*$/, '');
            oSB.add("]");
        }
        oSB.replace(/,\s*$/, '');
        //aParts[aParts.length - 1] = aParts[aParts.length - 1].replace(/,\s*$/, '');
    };

    OPA5CodeStrategy.prototype.__createAttrValue = function (oToken, objectMatcher) {
        var value = this.__code.constants.filter(function (c) {
                if (typeof oToken.criteriaValue === "boolean") {
                    return c.value === oToken.criteriaValue;
                } else {
                    return c.value === oToken.criteriaValue.trim();
                }
            })[0] ? this.__code.constants.filter(function (c) {
                if (typeof oToken.criteriaValue === "boolean") {
                    return c.value === oToken.criteriaValue;
                } else {
                    return c.value === oToken.criteriaValue.trim();
                }
            })[0].symbol : typeof oToken.criteriaValue === "boolean" ?
            oToken.criteriaValue :
            this.__sanatize(oToken.criteriaValue.trim());

        if (typeof value === 'object') {
            //console.log('stringify object');
        }
        objectMatcher['ATTR'] ?
            objectMatcher['ATTR'].push('{' + oToken.subCriteriaType + ': ' + value + '}') :
            objectMatcher['ATTR'] = ['{' + oToken.subCriteriaType + ': ' + value + '}'];
    };

    OPA5CodeStrategy.prototype.__createAggregationCheck = function (oStep, oCodeSettings) {
        var viewName = oStep.item.viewProperty.localViewName ? oStep.item.viewProperty.localViewName : "Detached";
        var oAGGProp = oStep.assertFilter[0];
        var aParts = [Array(3).join('\t') + 'Then.'];

        aParts.push('on' + viewName);

        if (oAGGProp.criteriaValue === 0) {
            if (oAGGProp.operatorType === 'EQ') {
                this.__pages[viewName].addAggregationEmpty();
                aParts.push('.iAggregationEmpty({');
                //aParts.push('objectProps: ')
            }

            if (oAGGProp.operatorType === 'GT') {
                this.__pages[viewName].addAggregationFilled();
                aParts.push('.iAggregationFilled({');
                //aParts.push('objectProps: ')
            }
        } else {
            this.__pages[viewName].addAggregationCount();
            aParts.push('.iAggregationCounts({');
            //aParts.push('objectProps: ');
        }

        this.__createObjectMatcherInfos(oStep, aParts);

        aParts.push(', ');

        if (oAGGProp.criteriaValue > 0) {
            aParts.push('count: ');
            aParts.push(oAGGProp.criteriaValue + ', ');
        }

        var aggName = oAGGProp.subCriteriaType.substring(0, oAGGProp.subCriteriaType.indexOf('/'));
        aParts.push('aggName: "' + aggName + '"});');

        return aParts.reduce((a, b) => a + b, '');
    };

    OPA5CodeStrategy.prototype.__sanatize = function (sString) {
        return '"' + sString + '"';
    };

    OPA5CodeStrategy.prototype.__generateCommonPage = function () {
        var aCode = [];
        aCode.push('sap.ui.define([\n');
        aCode.push(Array(2).join('\t') + '"sap/ui/test/Opa5",\n');
        aCode.push(Array(2).join('\t') + '"' + this.__namespace.replace(/\./g, '/') + "/<testPath>/MockServer" + '"\n');
        aCode.push('], function(Opa5, MockServer) {\n');
        aCode.push(Array(2).join('\t') + '"use strict";\n\n');
        aCode.push(Array(2).join('\t') + 'function _wrapParameters(oParameters) {\n');
        aCode.push(Array(3).join('\t') + 'return {\n');
        aCode.push(Array(4).join('\t') + 'get: function(name) {\n');
        aCode.push(Array(5).join('\t') + 'return (oParameters[name] || "").toString();\n');
        aCode.push(Array(4).join('\t') + '}\n');
        aCode.push(Array(3).join('\t') + '};\n');
        aCode.push(Array(2).join('\t') + '}\n\n');
        aCode.push(Array(2).join('\t') + 'return Opa5.extend("' + this.__namespace + '.<testPath>.Common", {\n');
        aCode.push(Array(3).join('\t') + 'iStartTheAppByHash: function(oParameters) {\n');
        aCode.push(Array(4).join('\t') + 'MockServer.init(_wrapParameters(oParameters || {}));\n');
        aCode.push(Array(4).join('\t') + 'this.iStartMyUIComponent({\n');
        aCode.push(Array(5).join('\t') + 'componentConfig: {\n');
        aCode.push(Array(6).join('\t') + 'name: "' + this.__namespace + '",\n');
        aCode.push(Array(6).join('\t') + 'async: true\n');
        aCode.push(Array(5).join('\t') + '},\n');
        aCode.push(Array(5).join('\t') + 'hash: oParameters.hash\n');
        aCode.push(Array(4).join('\t') + '});\n');
        aCode.push(Array(3).join('\t') + '},\n');
        aCode.push(Array(3).join('\t') + 'iTeardownTheApp: function() {\n');
        aCode.push(Array(4).join('\t') + 'this.iTeardownMyUIComponent();\n');
        aCode.push(Array(3).join('\t') + '}\n');
        aCode.push(Array(2).join('\t') + '});\n');
        aCode.push('});');
        return aCode.reduce((a, b) => a + b, '');
    };

    OPA5CodeStrategy.prototype.__capitalize = function (sString) {
        if (typeof sString !== 'string') {
            return '';
        }
        return sString.charAt(0).toUpperCase() + sString.slice(1);
    };

    OPA5CodeStrategy.prototype._versionGE = function (sCheckVersion, sTargetVersion) {
        var iComparisonResult = this._compareVersion(sCheckVersion, sTargetVersion);
        if (iComparisonResult) {
            return iComparisonResult >= 0;
        } else {
            return false;
        }
    };

    /**
     * @param {string} v1 version string 1 
     * @param {string} v2 version string 2
     *
     * @returns {number} 1 if v1 > v2, -1 if v1 < v2 and 0 if both equal
     */
    OPA5CodeStrategy.prototype._compareVersion = function (v1, v2) {
        if (typeof v1 !== 'string') {
            return false;
        }
        if (typeof v2 !== 'string') {
            return false;
        }
        v1 = v1.split('.');
        v2 = v2.split('.');
        const k = Math.min(v1.length, v2.length);
        for (let i = 0; i < k; ++i) {
            v1[i] = parseInt(v1[i], 10);
            v2[i] = parseInt(v2[i], 10);
            if (v1[i] > v2[i]) {
                return 1;
            }
            if (v1[i] < v2[i]) {
                return -1;
            }
        }

        if (v1.length == v2.length) {
            return 0;
        } else {
            return v1.length < v2.length ? -1 : 1;
        }
    };

    return OPA5CodeStrategy;
});