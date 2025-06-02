import api from './apiService';
import { API_CONFIG, Brand, CreateBrand, UpdateBrand, IDP } from 'shared';

export const brandService = {
  getBrands: async (): Promise<Brand[]> => {
    const response = await api.get<Brand[]>(API_CONFIG.endpoints.brands.base);
    return response.data;
  },

  getBrandById: async (id: string): Promise<Brand> => {
    const response = await api.get<Brand>(API_CONFIG.endpoints.brands.byId(id));
    return response.data;
  },

  createBrand: async (brand: CreateBrand): Promise<Brand> => {
    const response = await api.post<Brand>(API_CONFIG.endpoints.brands.base, brand);
    return response.data;
  },

  updateBrand: async (id: string, brand: UpdateBrand): Promise<Brand> => {
    const response = await api.put<Brand>(API_CONFIG.endpoints.brands.byId(id), brand);
    return response.data;
  },

  deleteBrand: async (id: string): Promise<{ message: string }> => {
    const response = await api.delete<{ message: string }>(API_CONFIG.endpoints.brands.byId(id));
    return response.data;
  },

  getBrandPathway: async (id: string): Promise<IDP> => {
    const response = await api.get<IDP>(API_CONFIG.endpoints.brands.pathway(id));
    return response.data;
  },
};
