import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/authMiddleware';

// Temporary brand data (will be replaced with database later)
const brands = [
  {
    id: '1',
    name: 'Example Brand',
    description: 'A brand created as an example',
    userId: '2',
    visionStatement: 'To revolutionize the industry',
    missionStatement: 'Provide the best service possible',
    uniqueValueProposition: 'Unmatched quality and innovation',
    values: ['Quality', 'Innovation', 'Customer-focus'],
    createdAt: '2023-01-01T00:00:00.000Z',
    updatedAt: '2023-01-01T00:00:00.000Z',
  },
];

// @desc    Get all brands for a user
// @route   GET /api/brands
// @access  Private
export const getBrands = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401);
    throw new Error('Not authorized');
  }

  // If admin, return all brands, else return only user's brands
  const userBrands = req.user.role === 'admin' 
    ? brands 
    : brands.filter(brand => brand.userId === req.user?.id);
  
  res.status(200).json(userBrands);
});

// @desc    Get brand by ID
// @route   GET /api/brands/:id
// @access  Private
export const getBrandById = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401);
    throw new Error('Not authorized');
  }

  const brand = brands.find(b => b.id === req.params.id);

  if (!brand) {
    res.status(404);
    throw new Error('Brand not found');
  }

  // Check if user owns the brand or is admin
  if (brand.userId !== req.user.id && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to access this brand');
  }

  res.status(200).json(brand);
});

// @desc    Create new brand
// @route   POST /api/brands
// @access  Private
export const createBrand = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401);
    throw new Error('Not authorized');
  }

  const { name, description, visionStatement, missionStatement, uniqueValueProposition, values } = req.body;

  // Create brand
  const brand = {
    id: (brands.length + 1).toString(),
    name,
    description,
    userId: req.user.id,
    visionStatement,
    missionStatement,
    uniqueValueProposition,
    values: values || [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  brands.push(brand);

  res.status(201).json(brand);
});

// @desc    Update brand
// @route   PUT /api/brands/:id
// @access  Private
export const updateBrand = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401);
    throw new Error('Not authorized');
  }

  const brandIndex = brands.findIndex(b => b.id === req.params.id);

  if (brandIndex === -1) {
    res.status(404);
    throw new Error('Brand not found');
  }

  // Check if user owns the brand or is admin
  if (brands[brandIndex].userId !== req.user.id && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to update this brand');
  }

  const { name, description, visionStatement, missionStatement, uniqueValueProposition, values } = req.body;

  if (name) brands[brandIndex].name = name;
  if (description) brands[brandIndex].description = description;
  if (visionStatement) brands[brandIndex].visionStatement = visionStatement;
  if (missionStatement) brands[brandIndex].missionStatement = missionStatement;
  if (uniqueValueProposition) brands[brandIndex].uniqueValueProposition = uniqueValueProposition;
  if (values) brands[brandIndex].values = values;
  
  brands[brandIndex].updatedAt = new Date().toISOString();

  res.status(200).json(brands[brandIndex]);
});

// @desc    Delete brand
// @route   DELETE /api/brands/:id
// @access  Private
export const deleteBrand = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401);
    throw new Error('Not authorized');
  }

  const brandIndex = brands.findIndex(b => b.id === req.params.id);

  if (brandIndex === -1) {
    res.status(404);
    throw new Error('Brand not found');
  }

  // Check if user owns the brand or is admin
  if (brands[brandIndex].userId !== req.user.id && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to delete this brand');
  }

  brands.splice(brandIndex, 1);

  res.status(200).json({ message: 'Brand removed' });
});

// @desc    Get Interactive Decision Pathway for a brand
// @route   GET /api/brands/:id/pathway
// @access  Private
export const getInteractiveDecisionPathway = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401);
    throw new Error('Not authorized');
  }

  const brand = brands.find(b => b.id === req.params.id);

  if (!brand) {
    res.status(404);
    throw new Error('Brand not found');
  }

  // Check if user owns the brand or is admin
  if (brand.userId !== req.user.id && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to access this brand');
  }

  // Mock IDP data - this would be generated based on the brand and AI in a real implementation
  const idp = {
    brandId: brand.id,
    stages: [
      {
        id: '1',
        name: 'Foundation',
        description: 'Establish the core brand foundation',
        status: 'completed',
        tasks: [
          {
            id: '101',
            name: 'Vision & Mission',
            description: 'Define your brand vision and mission',
            status: 'completed'
          },
          {
            id: '102',
            name: 'Unique Value Proposition',
            description: 'Articulate what makes your brand unique',
            status: 'completed'
          }
        ]
      },
      {
        id: '2',
        name: 'Strategy',
        description: 'Develop your brand strategy',
        status: 'in-progress',
        tasks: [
          {
            id: '201',
            name: 'Target Audience',
            description: 'Define your target audience personas',
            status: 'in-progress'
          },
          {
            id: '202',
            name: 'Competitive Analysis',
            description: 'Analyze your competition',
            status: 'not-started'
          }
        ]
      },
      {
        id: '3',
        name: 'Identity',
        description: 'Create your visual brand identity',
        status: 'not-started',
        tasks: [
          {
            id: '301',
            name: 'Visual Elements',
            description: 'Design logo, colors, and typography',
            status: 'not-started'
          },
          {
            id: '302',
            name: 'Voice & Tone',
            description: 'Define your brand voice and messaging',
            status: 'not-started'
          }
        ]
      }
    ]
  };

  res.status(200).json(idp);
});
