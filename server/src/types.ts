export type Source = { title:string; url:string; sourceType:'website'|'book'|'youtube'; description?:string; author?:string };
export type LessonSection = { title:string; duration:number; content:string; examples:string[]; activity?:string };
export type Lesson = { title:string; objective:string; estimatedMinutes:number; audience?:string; prerequisites?:string[]; outcomes:string[]; sections:LessonSection[]; knowledgeCheck:{question:string;options:string[];answer:string;explanation:string}[]; takeaways:string[]; sources:Source[] };
export type QCIssue = { severity:'Critical'|'High'|'Medium'|'Low'; location:string; issue:string; recommendation:string };
export type QCReport = { layer:'research'|'instructional'; status:'PASS'|'NEEDS_REVIEW'|'FAIL'; score:number; summary:string; issues:QCIssue[]; checkedAt:string };
