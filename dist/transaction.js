"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.transaction = void 0;
const data_store_client_1 = require("./data-store-client");
function transaction() {
    return function (target, propertyKey, descriptor) {
        const original = descriptor.value;
        descriptor.value = function (...args) {
            return __awaiter(this, void 0, void 0, function* () {
                if (this.dsClient.mode != data_store_client_1.Modes.local && this.dsClient.transactionHandle == undefined) {
                    const transactionResult = yield this.dsClient.firestoreHandle.runTransaction((transaction) => __awaiter(this, void 0, void 0, function* () {
                        this.dsClient.setTransaction(transaction);
                        return yield original.apply(this, args);
                    }));
                    this.dsClient.resetTransaction();
                    return transactionResult;
                }
                else {
                    return yield original.apply(this, args);
                }
            });
        };
        return descriptor;
    };
}
exports.transaction = transaction;
//# sourceMappingURL=transaction.js.map