"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pdf_parse_1 = require("pdf-parse");
console.log("PDFParse class:", typeof pdf_parse_1.PDFParse, pdf_parse_1.PDFParse);
console.log("Prototype keys:", Object.getOwnPropertyNames(pdf_parse_1.PDFParse.prototype));
console.log("Static keys:", Object.getOwnPropertyNames(pdf_parse_1.PDFParse));
// Let's instantiate it or see how it is called
try {
    // Is it new PDFParse(buffer) or similar?
    console.log("Constructor length:", pdf_parse_1.PDFParse.length);
}
catch (e) {
    console.log("Error:", e.message);
}
