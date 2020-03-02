sap.ui.define([], function () {
    "use strict";

    class ConnectionMessages {

        /**
         *
         * @param {com.ui5.testing.model.Connection} connection the connection to use for sending messages
         */
        static getWindowInfo(oConnection) {
            return oConnection.syncMessage({
                action: "getWindowInfo"
            });
        }

        /**
         *
         * @param {com.ui5.testing.model.Connection} connection the connection to use for sending messages
         * @param {object} oInformation parameters for the start message
         */
        static startRecording(oConnection, oInformation) {
            return oConnection.syncMessage({
                action: "startRecording",
                data: oInformation
            });
        }

        /**
         *
         * @param {com.ui5.testing.model.Connection} connection the connection to use for sending messages
         */
        static stopRecording(oConnection) {
            return oConnection.syncMessage({
                action: "stopRecording"
            });
        }

        /**
         *
         * @param {com.ui5.testing.model.Connection} connection the connection to use for sending messages
         * @param {object} oItemSelector selector information
         */
        static findElements(oConnection, oItemSelector) {
            return oConnection.syncMessage({
                action: "findItemsBySelector",
                data: oItemSelector
            });
        }

        /**
         *
         * @param {com.ui5.testing.model.Connection} connection the connection to use for sending messages
         * @param {object} oItemSelector selector information
         */
        static selectItem(oConnection, oItemSelector) {
            return oConnection.syncMessage({
                action: "selectItem",
                data: oItemSelector
            });
        }

        /**
         * Check the preconditions for an action based on the given item selector.
         *
         * @param {com.ui5.testing.model.Connection} connection the connection to use for sending messages
         * @param {object} oItemSelector selector information
         */
        static checkAction(oConnection, oItemSelector) {
            return oConnection.syncMessage({
                action: "checkAction",
                data: oItemSelector
            });
        }

        /**
         *
         * @param {com.ui5.testing.model.Connection} connection the connection to use for sending messages
         * @param {object} oInformation parameters for the execute message
         */
        static executeAction(oConnection, oInformation) {
            return oConnection.syncMessage({
                action: "executeAction",
                data: oInformation
            });
        }

        /**
         *
         * @param {com.ui5.testing.model.Connection} connection the connection to use for sending messages
         * @param {object} oInformation parameters for the assert message
         */
        static executeAssert(oConnection, oInformation) {
            return oConnection.syncMessage({
                action: "executeAssert",
                data: oInformation
            });
        }

        /**
         *
         * @param {com.ui5.testing.model.Connection} connection the connection to use for sending messages
         * @param {object} oInformation component information for the support-assistant message
         */
        static runSupportAssistant(oConnection, oComponent) {
            return oConnection.syncMessage({
                action: "runSupportAssistant",
                data: oComponent
            });
        }

        /**
         *
         * @param {com.ui5.testing.model.Connection} connection the connection to use for sending messages
         */
        static lockPage(oConnection) {
            return oConnection.syncMessage({
                action: "lockPage"
            });
        }

        /**
         *
         * @param {com.ui5.testing.model.Connection} connection the connection to use for sending messages
         */
        static unlockPage(oConnection) {
            return oConnection.syncMessage({
                action: "unlockPage"
            });
        }

    }

    return ConnectionMessages;
});
