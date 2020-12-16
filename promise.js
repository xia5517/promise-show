const PENDING = 'PENDING'
const RESOLVED = 'RESOLVED'
const REJECTED = 'REJECTED'

resolvePromise = (p2, x, resolve, reject) => {
    // 避免爸爸的儿子是爸爸 循环引用
    if (p2 === x) {
        reject(new TypeError('Circular reference'))
    }

    let called = false
    // 鸭子类型判断 Promise
    // 如果可以有属性的东西
    // 且有 then 方法, 认为它是一个 Promise 对象
    if (
        (typeof x === 'object' && x !== null)
        || typeof x === 'function'
    ) {
        try {
            const {then} = x
            if (typeof then === 'function') {
                then.call(x, y => {
                    if (called) return
                    called = true
                    resolvePromise(p2, y, resolve, reject)
                }, e => {
                    if (called) return
                    called = true
                    reject(e)
                })
            } else {
                resolve(x)
            }
        } catch (e) {
            if (called) return
            called = true
            reject(e)
        }
    } else {
        resolve(x)
    }
}
class Promise {
    constructor(excutor) {
        this.status = PENDING
        this.value = null
        this.reason = null

        this.onFulfilledCallbacks = []
        this.onRejectedCallbacks = []

        const resolve = value => {
            // resolve（value），当value是个promise，要value.then(data => resolve(data))继续执行promise的值
            if (value instanceof Promise) {
                return value.then(data => resolve(data), e =>  reject(e))
            }

            if (this.status === PENDING) {
                this.value = value
                this.status = RESOLVED
                this.onFulfilledCallbacks.forEach(fn => fn())
            }
        }

        const reject = reason => {
            if (this.status === PENDING) {
                this.reason = reason
                this.status = REJECTED
                this.onRejectedCallbacks.forEach(fn => fn())
            }
        }

        try {
            excutor(resolve, reject)
        } catch (e) {
            reject(e)
        }

    }

    then(onFullfilled, onRejected) {
        onFullfilled = typeof onFullfilled === 'function' ? onFullfilled : v => v
        onRejected = typeof onRejected === 'function' ? onRejected : e => {throw e}

        const p2 = new Promise((resolve, reject) => {
            if (this.status === RESOLVED) {
                setTimeout(() => {
                    try {
                        const x = onFullfilled(this.value)
                        resolvePromise(p2, x, resolve, reject)
                    } catch (e) {
                        reject(e)
                    }
                });
            }

            if (this.status === REJECTED) {
                setTimeout(() => {
                    try {
                        const x = onRejected(this.reason)
                        resolvePromise(p2, x, resolve, reject)
                    } catch (e) {
                        reject(e)
                    }
                });
            }

            if (this.status === PENDING) {
                // x = p.then(f1); y = p.then(f2); onFulfilledCallbacks(f1, f2); 在状态判定前排好onFullfilled队列 此时是【f1, f2 ...】
                // x = p.then(f1); y = x.then(f2); p: onFulfilledCallbacks(f1), x: onFulfilledCallbacks(f2), 此时是 f1 -> f2 链式存储
                this.onFulfilledCallbacks.push(() => {
                    setTimeout(() => {
                        try {
                            const x = onFullfilled(this.value)
                            
                            // 当 x 还是个primose，要继续执行。
                            resolvePromise(p2, x, resolve, reject)
                        } catch (e) {
                            reject(e)
                        }
                    });
                })
                this.onRejectedCallbacks.push(() => {
                    setTimeout(() => {
                        try {
                            const x = onRejected(this.reason)
                            resolvePromise(p2, x, resolve, reject)
                        } catch (e) {
                            reject(e)
                        }
                    });
                })
            }
        })

        return p2
    }
}

Promise.defer = Promise.deferred = function () {
    const dfd = {}
    dfd.promise = new Promise((resolve, reject) => {
      dfd.resolve = resolve
      dfd.reject = reject
    })
    return dfd
}

module.exports = Promise
