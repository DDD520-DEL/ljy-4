import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  BackgroundVariant,
  Node,
  Edge,
  Connection,
  Handle,
  Position,
  MarkerType,
  useNodesState,
  useEdgesState,
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Plus,
  Info,
  Network,
  ArrowLeft,
} from 'lucide-react';
import { petApi, relationApi, Pet, PedigreeNode } from '../services/api';

interface PetNodeData {
  label: string;
  pet: Pet;
  gender: string;
  breed: string | null;
  isBreeding: boolean;
}

function PetNode({ data, selected }: { data: PetNodeData; selected?: boolean }) {
  const genderColor = data.gender === 'male' ? 'border-blue-400' : data.gender === 'female' ? 'border-pink-400' : 'border-gray-400';
  const genderBg = data.gender === 'male' ? 'bg-blue-50' : data.gender === 'female' ? 'bg-pink-50' : 'bg-gray-50';
  const emoji = data.pet.species === 'dog' ? '🐕' : data.pet.species === 'cat' ? '🐱' : '🐾';

  return (
    <div
      className={`pet-node bg-white rounded-xl border-2 ${genderColor} ${
        selected ? 'ring-2 ring-primary-500 ring-offset-2' : ''
      } min-w-[140px]`}
    >
      <Handle type="target" position={Position.Top} className="!bg-primary-500" />
      <div className={`${genderBg} px-3 py-2 border-b ${genderColor} border-opacity-30`}>
        <div className="flex items-center justify-center gap-2">
          <span className="text-xl">{emoji}</span>
          <span className="font-semibold text-gray-900 text-sm">{data.label}</span>
        </div>
      </div>
      <div className="px-3 py-2">
        <p className="text-xs text-gray-500 text-center truncate">
          {data.breed || '未知品种'}
        </p>
        {data.isBreeding && (
          <div className="mt-1 flex justify-center">
            <span className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">
              种用
            </span>
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-primary-500" />
    </div>
  );
}

const nodeTypes = {
  petNode: PetNode as any,
};

export default function PedigreeTree() {
  const { petId } = useParams<{ petId?: string }>();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPet, setSelectedPet] = useState<string | null>(petId || null);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedNodeData, setSelectedNodeData] = useState<Pet | null>(null);

  useEffect(() => {
    loadPets();
  }, []);

  useEffect(() => {
    if (selectedPet && pets.length > 0) {
      buildPedigreeGraph();
    } else if (pets.length > 0 && !selectedPet) {
      setSelectedPet(pets[0].id);
    }
  }, [selectedPet, pets.length]);

  async function loadPets() {
    setLoading(true);
    try {
      const data = await petApi.list();
      setPets(data);
      if (data.length > 0 && !selectedPet) {
        setSelectedPet(data[0].id);
      }
    } catch (error) {
      console.error('加载宠物列表失败:', error);
    } finally {
      setLoading(false);
    }
  }

  async function buildPedigreeGraph() {
    if (!selectedPet) return;

    try {
      const pedigree = await petApi.pedigree(selectedPet, 4);
      const { nodes: newNodes, edges: newEdges } = convertPedigreeToFlow(
        pedigree,
        pets
      );
      setNodes(newNodes);
      setEdges(newEdges);
    } catch (error) {
      console.error('构建谱系图失败:', error);
    }
  }

  function convertPedigreeToFlow(
    root: PedigreeNode,
    allPets: Pet[]
  ): { nodes: Node[]; edges: Edge[] } {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    const nodeWidth = 160;
    const nodeHeight = 100;
    const genGapX = 200;
    const genGapY = 120;

    function addNode(
      node: PedigreeNode | null,
      x: number,
      y: number,
      parentId?: string,
      relationType?: string
    ) {
      if (!node) return;

      const petData = allPets.find((p) => p.id === node.id);

      nodes.push({
        id: node.id,
        type: 'petNode',
        position: { x, y },
        data: {
          label: node.name,
          pet: petData || node,
          gender: node.gender,
          breed: node.breed,
          isBreeding: node.isBreeding,
        } as PetNodeData,
        draggable: true,
      });

      if (parentId && relationType) {
        edges.push({
          id: `${parentId}-${node.id}-${relationType}`,
          source: parentId,
          target: node.id,
          type: 'smoothstep',
          animated: false,
          style: { stroke: '#94a3b8', strokeWidth: 2 },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#94a3b8',
          },
          label: relationType === 'father' ? '父' : '母',
          labelStyle: { fontSize: 10, fill: '#64748b' },
          labelBgPadding: [4, 2],
          labelBgStyle: { fill: 'white' },
        });
      }

      if (node.father || node.mother) {
        const childX = x - genGapX;
        const fatherY = y - genGapY / 2;
        const motherY = y + genGapY / 2;

        if (node.father) {
          addNode(node.father, childX, fatherY, node.id, 'father');
        }
        if (node.mother) {
          addNode(node.mother, childX, motherY, node.id, 'mother');
        }
      }
    }

    addNode(root, 400, 300);

    return { nodes, edges };
  }

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: 'smoothstep',
            style: { stroke: '#22c55e', strokeWidth: 2 },
          },
          eds
        )
      );
    },
    [setEdges]
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const pet = pets.find((p) => p.id === node.id);
      setSelectedNodeData(pet || null);
    },
    [pets]
  );

  async function handleAddRelation(parentId: string, childId: string, relationType: string) {
    try {
      await relationApi.create({ parentId, childId, relationType });
      loadPets();
      setTimeout(buildPedigreeGraph, 300);
      setShowAddPanel(false);
      alert('亲属关系已添加');
    } catch (error: any) {
        alert(`添加失败: ${error.error || '未知错误'}`);
      }
  }

  const fitView = useCallback(() => {
    if (reactFlowWrapper.current) {
      const reactFlowInstance = (reactFlowWrapper.current as any).__reactFlowInstance;
      if (reactFlowInstance?.fitView) {
        reactFlowInstance.fitView({ padding: 0.2 });
      }
    }
  }, []);

  if (loading) {
    return <div className="text-center py-12 text-gray-500">加载中...</div>;
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/pets"
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">谱系图</h1>
            <p className="text-gray-600">可视化展示宠物家族谱系关系，支持拖拽编辑</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedPet || ''}
            onChange={(e) => setSelectedPet(e.target.value)}
            className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            {pets.map((pet) => (
              <option key={pet.id} value={pet.id}>
                {pet.name} ({pet.breed || pet.species})
              </option>
            ))}
          </select>

          <button
            onClick={() => setShowAddPanel(!showAddPanel)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            添加关系
          </button>
        </div>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden relative">
          <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
            <button
              onClick={() => {}}
              className="w-9 h-9 bg-white border border-gray-200 rounded-lg flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm"
              title="放大"
            >
              <ZoomIn className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={() => {}}
              className="w-9 h-9 bg-white border border-gray-200 rounded-lg flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm"
              title="缩小"
            >
              <ZoomOut className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={fitView}
              className="w-9 h-9 bg-white border border-gray-200 rounded-lg flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm"
              title="适应视图"
            >
              <Maximize2 className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          <div ref={reactFlowWrapper} className="w-full h-full">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={onNodeClick}
              nodeTypes={nodeTypes}
              fitView
              attributionPosition="bottom-left"
              className="bg-gray-50"
            >
              <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#e2e8f0" />
              <MiniMap
                nodeColor={(node) => {
                  const data = node.data as PetNodeData;
                  return data?.gender === 'male' ? '#3b82f6' : data?.gender === 'female' ? '#ec4899' : '#6b7280';
                }}
                className="!bg-white !border !border-gray-200 !rounded-lg !shadow-sm"
              />
              <Controls className="!border !border-gray-200 !rounded-lg !shadow-sm" />
            </ReactFlow>
          </div>

          <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur px-4 py-2 rounded-lg border border-gray-200 text-xs text-gray-500">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span>雄性</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-pink-500"></div>
                <span>雌性</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-green-100 border border-green-300"></div>
                <span>种用</span>
              </div>
            </div>
          </div>
        </div>

        {showAddPanel && (
          <div className="w-80 bg-white rounded-xl shadow-sm border border-gray-200 p-5 overflow-auto">
            <h3 className="font-semibold text-gray-900 mb-4">添加亲属关系</h3>
            <p className="text-sm text-gray-500 mb-4">
              选择两只宠物并建立亲属关系
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  子代
                </label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value=""
                  disabled
                >
                  <option>{selectedPet
                    ? pets.find((p) => p.id === selectedPet)?.name
                    : '请选择'}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  关系类型
                </label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  defaultValue=""
                >
                  <option value="father">父亲</option>
                  <option value="mother">母亲</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  亲属宠物
                </label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  defaultValue=""
                >
                  <option value="">请选择宠物</option>
                  {pets
                    .filter((p) => p.id !== selectedPet)
                    .map((pet) => (
                      <option key={pet.id} value={pet.id}>
                        {pet.name} ({pet.breed || pet.species})
                      </option>
                    ))}
                </select>
              </div>

              <div className="pt-2 space-y-2">
                <button
                  onClick={() => {
                  const parentId = (
                    document.querySelector(
                      'select:nth-of-type(3)'
                    ) as HTMLSelectElement
                  )?.value;
                  const relationType = (
                    document.querySelector(
                      'select:nth-of-type(2)'
                    ) as HTMLSelectElement
                  )?.value;
                  if (selectedPet && parentId && relationType) {
                    handleAddRelation(parentId, selectedPet, relationType);
                  }
                }}
                  className="w-full py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
                >
                  确认添加
                </button>
                <button
                  onClick={() => setShowAddPanel(false)}
                  className="w-full py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        )}

        {selectedNodeData && !showAddPanel && (
          <div className="w-80 bg-white rounded-xl shadow-sm border border-gray-200 p-5 overflow-auto">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-primary-100 to-secondary-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">
                  {selectedNodeData.species === 'dog'
                    ? '🐕'
                    : selectedNodeData.species === 'cat'
                    ? '🐱'
                    : '🐾'}
                </span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">
                  {selectedNodeData.name}
                </h3>
                <p className="text-sm text-gray-500">
                  {selectedNodeData.breed || '未知品种'}
                </p>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">性别</span>
                <span className="text-gray-900">
                  {selectedNodeData.gender === 'male'
                    ? '雄性'
                    : selectedNodeData.gender === 'female'
                    ? '雌性'
                    : '未知'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">物种</span>
                <span className="text-gray-900">
                  {selectedNodeData.species === 'dog'
                    ? '犬'
                    : selectedNodeData.species === 'cat'
                    ? '猫'
                    : selectedNodeData.species}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">种用</span>
                <span className="text-gray-900">
                  {selectedNodeData.isBreeding ? '是' : '否'}
                </span>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <Link
                to={`/pets/${selectedNodeData.id}`}
                className="flex items-center justify-center gap-2 w-full py-2 bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 transition-colors text-sm font-medium"
              >
                <Info className="w-4 h-4" />
                查看详情
              </Link>
              <button
                onClick={() => {
                  setSelectedPet(selectedNodeData.id);
                }}
                className="flex items-center justify-center gap-2 w-full py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
              >
                <Network className="w-4 h-4" />
                以此为中心
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
