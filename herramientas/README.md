# herramientas de diseño

Scripts que generaron y verificaron decisiones de diseño de plan. No forman
parte de la aplicación: no se despliegan ni los carga nadie. Están aquí para
que la próxima vez que haya que tocar la paleta no se decida a ojo.

- `lib.py` — conversión sRGB↔Lab↔LCh, contraste WCAG, CIEDE2000 y simulación
  de daltonismo (Viénot-Brettel-Mollon). Sin dependencias.
- `refina.py` — genera la paleta v3 de asignaturas: optimiza tono, luminosidad
  y croma dentro de las restricciones (L\* 43–49, C\* 20–30, contraste ≥3,2:1)
  maximizando la distancia del **peor par**, tanto en visión normal como en
  deuteranopia y protanopia. Después la ordena de forma codiciosa para que los
  primeros colores repartidos sean los más distintos entre sí.
- `final.py` — versión anterior del optimizador, conservada porque documenta
  el error: maximizar la métrica sin acotar la banda de luminosidad produce una
  paleta de dos castas visibles, matemáticamente óptima y visualmente rota.

```
python3 refina.py
```

Regla: si cambias `SUBJECT_COLORS`, actualiza los tokens `--cat-*` en el mismo
commit y vuelve a pasar `refina.py` para comprobar que las métricas aguantan.
