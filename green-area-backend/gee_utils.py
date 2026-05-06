import ee


def mask_s2_clouds(image):
    qa = image.select('QA60')
    cloud_bit = 1 << 10
    cirrus_bit = 1 << 11
    mask = (
        qa.bitwiseAnd(cloud_bit).eq(0)
        .And(qa.bitwiseAnd(cirrus_bit).eq(0))
    )
    return (image.updateMask(mask)
                 .divide(10000)
                 .copyProperties(image, ['system:time_start']))


def _mask_landsat_clouds(image):
    qa = image.select('QA_PIXEL')
    mask = (qa.bitwiseAnd(1 << 4).eq(0)
              .And(qa.bitwiseAnd(1 << 3).eq(0)))
    return image.updateMask(mask)


def scale_lst(image):
    masked = _mask_landsat_clouds(image)
    lst = (masked.select('ST_B10')
                 .multiply(0.00341802)
                 .add(149.0)
                 .subtract(273.15)
                 .rename('LST'))
    return masked.addBands(lst)


def get_lst_col(geom, year: int, month: int = None):
    filters = [
        ee.Filter.lt('CLOUD_COVER', 40),
        ee.Filter.calendarRange(year, year, 'year'),
    ]
    if month:
        filters.append(ee.Filter.calendarRange(month, month, 'month'))

    def build(cid):
        return (ee.ImageCollection(cid)
                .filterBounds(geom)
                .filter(ee.Filter.And(*filters))
                .map(scale_lst)
                .select('LST'))

    return build('LANDSAT/LC08/C02/T1_L2').merge(
           build('LANDSAT/LC09/C02/T1_L2'))


def reduce_lst(col, geom, scale):
    stats = (col.median()
               .reduceRegion(
                   reducer=ee.Reducer.mean()
                           .combine(ee.Reducer.min(), '', True)
                           .combine(ee.Reducer.max(), '', True),
                   geometry=geom,
                   scale=scale,
                   maxPixels=1e10,
                   bestEffort=True)
               .getInfo())
    return (round(stats.get('LST_mean') or 0, 2),
            round(stats.get('LST_min')  or 0, 2),
            round(stats.get('LST_max')  or 0, 2))
