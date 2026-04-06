import streamlit as st
import pandas as pd
import plotly.express as px

# setting page config
st.set_page_config(page_title="Climate Change Dashboard", layout="wide")

# loading datasets
@st.cache_data
def load_data():
    df = pd.read_csv("final_merged_dataset.csv")
    
    # fixing mixed date formats safely
    df['dt'] = pd.to_datetime(df['dt'], errors='coerce', format='mixed')
    
    # removing any invalid dates after conversion
    df.dropna(subset=['dt'], inplace=True)
    
    return df

df = load_data()

st.title("🌍 Climate Change Analysis Dashboard")

# sidebar filters
st.sidebar.header("Filters")

countries = st.sidebar.multiselect("Select Country", df['Country'].unique(), default=df['Country'].unique()[:5])

filtered_df = df[df['Country'].isin(countries)]

# ===============================
# 🔹 TASK 3: EDA VISUALIZATIONS
# ===============================

st.header("📊 Exploratory Data Analysis")

# 1. Line Chart (Trend)
st.subheader("1. Temperature Trend Over Time")
fig1 = px.line(filtered_df, x='dt', y='AverageTemperature_city', color='Country')
st.plotly_chart(fig1, use_container_width=True)

# Explanation
st.write("Temperature trends show long-term warming patterns across selected countries.")

# 2. Histogram (Distribution)
st.subheader("2. Temperature Distribution")
fig2 = px.histogram(filtered_df, x='AverageTemperature_city', nbins=50)
st.plotly_chart(fig2, use_container_width=True)

st.write("Distribution reveals most temperatures cluster around moderate ranges.")

# 3. Box Plot (Outliers)
st.subheader("3. Temperature Outliers")
fig3 = px.box(filtered_df, x='Country', y='AverageTemperature_city')
st.plotly_chart(fig3, use_container_width=True)

st.write("Boxplots highlight anomalies and extreme temperature variations.")

# 4. Scatter Plot (Correlation)
st.subheader("4. Correlation: City vs Global Temperature")
fig4 = px.scatter(filtered_df,
                  x='AverageTemperature_city',
                  y='LandAverageTemperature',
                  color='Country')
st.plotly_chart(fig4, use_container_width=True)

st.write("Positive correlation indicates local temperatures follow global trends.")

# 5. Area Chart (Cumulative Trend)
st.subheader("5. Temperature Change Over Time")
fig5 = px.area(filtered_df, x='dt', y='AverageTemperature_city', color='Country')
st.plotly_chart(fig5, use_container_width=True)

# 6. Heatmap (Correlation Matrix)
st.subheader("6. Correlation Heatmap")
corr = filtered_df.select_dtypes(include='number').corr()
fig6 = px.imshow(corr, text_auto=True)
st.plotly_chart(fig6, use_container_width=True)

st.write("Heatmap shows relationships between multiple temperature variables.")

# ===============================
# 🔹 TASK 4: ADVANCED VISUALIZATION
# ===============================

st.header("🚀 Advanced Visualizations & Insights")

# 1. Multi-layer visualization
st.subheader("Multi-layer Trend (City vs Global)")
fig7 = px.line(filtered_df, x='dt', y='AverageTemperature_city', color='Country')
fig7.add_scatter(x=filtered_df['dt'], y=filtered_df['LandAverageTemperature'],
                 mode='lines', name='Global Temp')
st.plotly_chart(fig7, use_container_width=True)

st.write("Overlaying global and city temperatures shows synchronized climate patterns.")

# 2. Faceted chart
st.subheader("Faceted Temperature by Country")
fig8 = px.line(filtered_df, x='dt', y='AverageTemperature_city',
               facet_col='Country', facet_col_wrap=3)
st.plotly_chart(fig8, use_container_width=True)

# 3. Geospatial visualization
st.subheader("Geospatial Temperature Map")
fig9 = px.scatter_geo(filtered_df,
                      lat='Latitude',
                      lon='Longitude',
                      color='AverageTemperature_city',
                      hover_name='City')
st.plotly_chart(fig9, use_container_width=True)

# 4. Scenario Comparison
st.subheader("Scenario Comparison: High vs Low Temperature")

high_temp = filtered_df[filtered_df['AverageTemperature_city'] > filtered_df['AverageTemperature_city'].mean()]
low_temp = filtered_df[filtered_df['AverageTemperature_city'] <= filtered_df['AverageTemperature_city'].mean()]

fig10 = px.histogram(high_temp, x='AverageTemperature_city', color_discrete_sequence=['red'])
fig11 = px.histogram(low_temp, x='AverageTemperature_city', color_discrete_sequence=['blue'])

st.plotly_chart(fig10, use_container_width=True)
st.plotly_chart(fig11, use_container_width=True)

# 5. Uncertainty Visualization
st.subheader("Temperature Uncertainty")
fig12 = px.line(filtered_df, x='dt', y='AverageTemperatureUncertainty_city', color='Country')
st.plotly_chart(fig12, use_container_width=True)

st.write("Uncertainty highlights reliability of temperature measurements.")

# ===============================
# FINAL INSIGHTS
# ===============================

st.header("📌 Key Insights")

st.write("""
- Global temperatures show a clear upward trend over time.
- Strong correlation exists between global and local temperatures.
- Certain countries exhibit higher variability, indicating regional climate instability.
- Geospatial patterns reveal uneven warming across the globe.
- Temperature uncertainty varies across time, affecting confidence in measurements.
""")