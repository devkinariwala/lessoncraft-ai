import {describe,it,expect} from 'vitest';
import type {Lesson} from '../types.js';
const sample:Lesson={title:'Test',objective:'Explain test objective',estimatedMinutes:45,outcomes:[],sections:[{title:'A',duration:15,content:'',examples:[]},{title:'B',duration:15,content:'',examples:[]},{title:'C',duration:15,content:'',examples:[]}],knowledgeCheck:[],takeaways:[],sources:[]};
describe('lesson constraints',()=>{it('uses exactly 45 minutes',()=>expect(sample.sections.reduce((n,s)=>n+s.duration,0)).toBe(45));it('has sections',()=>expect(sample.sections.length).toBeGreaterThan(0));});
