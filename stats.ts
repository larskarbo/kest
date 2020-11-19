import { getBuckets, represent } from "./buckets";

import { getTransactions, getBankAccount } from "./sbanken";
import * as Database from "better-sqlite3";
import { v4 } from "uuid";
import axios from "axios";
import * as fs from "fs-extra";
import * as moment from "moment";
const deepEqual = require("deep-equal");
const db = Database("./Budget1.buckets", { verbose: console.log });

const yo = async () => {
  // const lt = db.prepare("SELECT * FROM account_transaction").all();
  // console.log("lt: ", lt);

  const buckets =  await getBuckets();
  console.log('buckets: ', buckets[0]);


  const lt = db.prepare("SELECT * FROM bucket_transaction").all();
  // console.log("lt: ", lt);
  const transes = lt.map(tr => {
    return {
      ...tr,
      bucket: buckets.find(b => b.id == tr.bucket_id).name
    }
  })
  const p = transes.filter(t => t.bucket.includes("Psy"))
  // console.log('p: ', p);
  let cum = 0
  p.forEach(e => {
    if(e.amount < 0){
      cum += e.amount
    }
    console.log(represent(e.amount), e.memo)
  })
  console.log(represent(cum))
  const asdf = transes.filter(t => t.amount == 490000)
  console.log('asdf: ', asdf);
};

yo()