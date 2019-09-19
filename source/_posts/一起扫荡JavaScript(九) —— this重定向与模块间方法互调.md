---
title: 一起扫荡JavaScript(九) —— this重定向与模块间方法互调
---

<br/>
<br/>
<br/>
&emsp;&emsp;this重定向，第一反应就是通过call，apply，那为什么要改变this？改变this在实际场景中又有怎样的应用？call，apply方法这么cool，又能否自己实现一个？
先来看一个场景。

#### 假设有一个数组[1,23,123,45,6,7,8231,21,89]，求出数组中最大的数。
&emsp;&emsp;你很自然的就会想到用一个for循环遍历数组，并不断的比对各个值，找到最大者：

``` bash
const maxArrVal = arr => {
     
     let res = arr[0];

     for(let i = 1; i < arr.length; i ++) {

         res = Math.max(res, arr[i]);
     }
     return res;
 }
 console.log(maxArrVal([1,23,123,45,6,7,8231,21,89]));
```
&emsp;&emsp;你会发现这里实际上执行的仅仅是max函数，只不过需要执行的对象的数据类型是一个数组，而Array原型中并没有这样的一个max函数，你会说，唉，假如能这样就好了。
``` bash
Array.max(arr)
```
&emsp;&emsp;当然，这是不现实的对吧？不可能一个已有的逻辑在另一个模块还得重复的被实现一遍，假如程序这样设计，你就会发现，整个语言的内置对象越来越庞大臃肿，而这显然不是设计的初衷想要的。但是呢，在实际的应用中，又有这样的刚需，那得怎么办呢？
看看下面的代码：
``` bash
 const maxArrValByApply = arr => Math.max.apply(null, arr);
 
 console.log(maxArrValByApply([1,23,123,45,6,7,8231,21,89]));
```
&emsp;&emsp;这是call，apply在实际应用中的一个常见的场景，模块间方法的互调。
&emsp;&emsp;实际上，这里把不同数据类型之间的内置对象来这里比喻成模块似乎不是特别的恰当，因为不同的数据类型处理方法很难有相同，但这有一定的相通之道。
&emsp;&emsp;call，apply另一个很常见的应用是this重定向，因为this在JavaScript中是一个很cool的东西，有时候也让人头疼，而有一个专门约束的机制是再好不过的了。
再看下面这个小例子。
&emsp;&emsp;toString是几乎每一种的数据类型（除了null，undefined）都会有的一个方法，它的作用顾名思义就是转成字符串。比如：
``` bash
 let object = {name: 'dorsey'},
     number = 12312313,
     array = [123,214],
     string = 'dasdas',
     boolean = true;
     
 console.log(object.toString()); //[object Object]
 console.log(number.toString()); //12312313
 console.log(array.toString());//123,214
 console.log(string.toString());//dasdas
 console.log(boolean.toString());//true
 console.log(Symbol().toString());//Symbol()
```
&emsp;&emsp;对象比较特殊，它内置的转化成字符串的时候转成的结果是[object Object]，在JavaScript中，万物皆对象，String，Number，Boolean，Array其实都是一个对象，或者说都是一个构造函数，你会发现typeof Array这样的实际上是一个function，所以它们都可以用new关键字，既然都是对象，所以对象中的toString方法在这里实际上是可以用的，这经常被用来做安全的类型校验，如下：
``` bash
console.log(Object.prototype.toString.apply([1,3])); //  [object Array]
```
&emsp;&emsp;而这里的toString执行的主体实际上变成了[1,3]，而这就是this的重定向。这样可以很方便的做安全的类型检查。
那apply，call方法实际上是怎么实现的呢？

&emsp;&emsp;很自然的就可以想到，将方法当做一个属性暂时性的放到执行的这个对象环境（作用域）里，执行后将该属性删除。

``` bash
Function.prototype.dorseyApply = function (context) {

     context.fn = this;
     let res = context.fn();
     delete context.fn;
     return res;
 }
```
&emsp;&emsp;这样会有一个问题，传入的这个作用域，可能本身就包含了属性fn，这样会把原来的fn给重置，显然不是我们想要的，这时候很显然就想到了Symbol，变成这样：
``` bash
Function.prototype.dorseyApply = function (context) {

    let _fn = Symbol();
    context[_fn] = this;
    let res = context[_fn]();
    delete context[_fn];
    return res;
}
```
&emsp;&emsp;但apply中是可以传入一个数组作为参数的，而这里并没有参数。而且，但没传入this时，默认是window对象，怎么做呢？看一下：
``` bash
 Function.prototype.dorseyApply = function (context) {
     context = context || window;
     let _fn = Symbol();
     context[_fn] = this;
     let res = typeof arguments[1] === 'undefined' ? context[_fn]() : context[_fn](...arguments[1]);;
     delete context[_fn];
     return res;
 }
```
&emsp;&emsp;但这样还有问题，因为引用类型的没有问题，但假如说是值类型的呢？比如这样调用：
``` bash
console.log(Object.prototype.toString.dorseyApply(Symbol()));
```
&emsp;&emsp;先看一个简单的例子：
``` bash
 let a = 'dorsey';
 a.hello = '你好啊';
 console.log(a.hello);   // undefined
```
&emsp;&emsp;你会发现是undefined，为什么呢？因为值类型的数据不能通过属性访问的方式来操作，挂载属性等等。那怎么做呢？但看似矛盾的你会发现一些方法比如split，toString是挂载在上面的，实际上是放在了原型中，作用域我们知道，既然在a中找不到，那就会在原型中找。而我们要做的就是往原型（prototype）中添加一个属性。
``` bash
Function.prototype.dorseyApply = function (context) {

    context = context || window;

    let _fn = Symbol(), res;

    let _type = typeof context;

    let _map = {

        'object': context,
        'string': String.prototype,
        'number': Number.prototype,
        'boolean': Boolean.prototype,
        'symbol': Symbol.prototype
    }

    _map[_type][_fn] = this;
    
    res = typeof arguments[1] === 'undefined' ? _map[_type][_fn]() : _map[_type][_fn](...arguments[1]);

    delete _map[_type][_fn];

    return res;
}
```
&emsp;&emsp;这样是不是就好了呢？我们试一下：
``` bash
let name = 'window作用域的name1';    //  注意用let声明的name在window里是访问不到的
let obj0 = {
   name: 'dorsey',
   fn (age) {
       console.log("我的名字叫：" + this.name, "我" + age + "岁");
   }
};
let obj1 = {
   name: 'sen'
};
console.log("=====dorseyApply=========");
obj0.fn();	
obj0.fn.dorseyApply();
obj0.fn.dorseyApply(null, [25]);
obj0.fn.dorseyApply(obj1, [25]);
Math.max.dorseyApply(null,[1,23,123,45,6,7,831,21,89]));
Object.prototype.toString.dorseyApply(Symbol());

console.log("======apply========");
obj0.fn();
obj0.fn.apply();
obj0.fn.apply(null, [25]);
obj0.fn.apply(obj1, [25]);
Math.max.apply(null,[1,23,123,45,6,7,831,21,89]));
Object.prototype.toString.apply(Symbol());
```
&emsp;&emsp;看起来好像没什么问题。因为apply第2个参数是需要传一个数组。但也有特例，比如传入一个类对象数组也是可以的。看看下面的：
``` bash
Array.dorseyApply(null, {length: 10})
```
&emsp;&emsp;你会发现这时候你就坑了，其实这个只需要转成真数组就好了。

``` bash
Function.prototype.dorseyApply = function (context) {

    context = context || window;

    let _fn = Symbol(), res;

    let _type = typeof context;

    let _map = {

        'object': context,
        'string': String.prototype,
        'number': Number.prototype,
        'boolean': Boolean.prototype,
        'symbol': Symbol.prototype
    }

    _map[_type][_fn] = this;
    
    res = typeof arguments[1] === 'undefined' ? _map[_type][_fn]() : _map[_type][_fn](...Array.from(arguments[1]));

    delete _map[_type][_fn];

    return res;
}
```
&emsp;&emsp;这样就OK了。其实这样不是特别好，因为在这里为了简便用了Array.from这样的方法，而在一个通用的方法中，最好是不要有这样某个模块下的方法的。
那call函数怎么实现呢？其实这两个几乎是一样，只不过call的传参方式是
``` bash
&emsp;&emsp;call(this, args1, args2 ...);
```
&emsp;&emsp;而apply是
``` bash
apply(this, [args1, args2 ...]);
```
&emsp;&emsp;这样其实只需要把apply的实现稍微转化一下就好了。
``` bash
Function.prototype.dorseyCall = function (context) {

    context = context || window;
    
    let _fn = Symbol(), res;

    let _type = typeof context,
        
        _map = {

        'object': context,
        'string': String.prototype,
        'number': Number.prototype,
        'boolean': Boolean.prototype,
        'symbol': Symbol.prototype
    }

    _map[_type][_fn] = this;

    res = typeof arguments[1] === 'undefined' ? _map[_type][_fn]() : _map[_type][_fn](...[...arguments].slice(1, arguments.length));

    delete _map[_type][_fn];

    return res;
}
```
&emsp;&emsp;好了，关于this重定向的call，apply这两个就暂时先介绍到这。
