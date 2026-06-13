Stat-presentation primitives — typographic, never decorative. All numerals are tabular mono.

```jsx
<Figure value="0.412" unit="NDVI" tag="ฤดูแล้ง 2569" progress={41.2} />

<KVRow cols={2}>
  <KV label="ต่ำสุด" value="0.18" hint="เขตเมืองชั้นใน" />
  <KV label="สูงสุด" value="0.74" hint="เขตชานเมือง" />
</KVRow>

<Note tone="warn" label="ข้อค้นพบ">
  อุณหภูมิผิวสูงกว่าค่าเฉลี่ย <span className="note__num">+2.4°C</span>
</Note>

<DefList items={[{ label: 'พื้นที่', value: '1,569 km²' }]} />
```
