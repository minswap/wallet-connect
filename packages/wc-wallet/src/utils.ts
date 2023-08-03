export const TIMEOUT_ERR_MESSAGE = 'request timed out!';

export const timeoutPromise = (fn: Promise<unknown>, ms = 5000) => {
  return new Promise((resolve, reject) => {
    fn.then(res => resolve(res)).catch(err => reject(err));
    setTimeout(() => reject(TIMEOUT_ERR_MESSAGE), ms);
  });
};
