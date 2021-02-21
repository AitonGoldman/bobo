import { Modes } from './data-store-client';

export function transaction() {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const original = descriptor.value;
    descriptor.value = async function (...args: any[]) {
      if (this.dsClient.mode != Modes.local && this.dsClient.transactionHandle == undefined) {
        const transactionResult = await this.dsClient.firestoreHandle.runTransaction(
          async (transaction) => {
            this.dsClient.setTransaction(transaction);
            return await original.apply(this, args);
          }
        );
        this.dsClient.resetTransaction();
        return transactionResult;
      } else {
        return await original.apply(this, args);
      }
    };
    return descriptor;
  };
}
