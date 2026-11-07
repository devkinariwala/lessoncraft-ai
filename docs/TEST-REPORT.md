# Manual acceptance test checklist

Run these checks after configuring API keys and MongoDB. Record the actual output/screenshots when demonstrating the project.

| ID | Scenario | Expected result | Result |
|---|---|---|---|
| T01 | Submit empty title | Inline validation; no API request | Not run |
| T02 | Submit short objective | Inline validation; no API request | Not run |
| T03 | Generate HTTP lesson | 45-minute lesson and source links | Not run |
| T04 | Generate SQL Joins lesson | 45-minute lesson and source links | Not run |
| T05 | Run research QC | Separate factual accuracy report | Not run |
| T06 | Run instructional QC | Separate instructional report | Not run |
| T07 | Edit lesson section | Editor reflects instructor edit | Not run |
| T08 | Save and reload lesson | Saved edit and reports persist | Not run |
| T09 | Export PDF | PDF includes lesson, references and both reports | Not run |
| T10 | Stop an external API / use invalid key | Clear error; current editor state retained; retry possible | Not run |
| T11 | Disconnect MongoDB | Health indicator shows offline and save failure is visible | Not run |

Do not mark tests as passed until they have been executed in the configured environment.
