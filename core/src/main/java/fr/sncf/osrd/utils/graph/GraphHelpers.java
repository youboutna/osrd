package fr.sncf.osrd.utils.graph;

import com.google.common.collect.Sets;
import com.google.common.graph.EndpointPair;
import com.google.common.graph.ImmutableNetwork;
import fr.sncf.osrd.infra.api.Direction;
import fr.sncf.osrd.infra.api.tracks.undirected.TrackEdge;
import fr.sncf.osrd.infra.api.tracks.undirected.TrackNode;
import fr.sncf.osrd.railjson.schema.common.graph.EdgeEndpoint;
import java.util.Collection;
import java.util.Set;

/** Collection of small static methods for ImmutableNetworks */
public class GraphHelpers {
    /** Returns the TrackNode matching the edge endpoint */
    public static TrackNode nodeFromEdgeEndpoint(ImmutableNetwork<TrackNode, TrackEdge> undirectedGraph,
                                                 TrackEdge edge, EdgeEndpoint endpoint) {
        var nodes = undirectedGraph.incidentNodes(edge);
        if (endpoint == EdgeEndpoint.BEGIN)
            return nodes.nodeU();
        else
            return nodes.nodeV();
    }

    /** Set of edges linked to the (edge, endpoint) */
    public static Set<TrackEdge> adjacentEdges(ImmutableNetwork<TrackNode, TrackEdge> undirectedGraph,
                                               TrackEdge edge, EdgeEndpoint endpoint) {
        TrackNode node = nodeFromEdgeEndpoint(undirectedGraph, edge, endpoint);
        return Sets.difference(undirectedGraph.incidentEdges(node), Set.of(edge));
    }

    /** Returns the nodes shared by the two adjacent edges.
     * It may return two nodes if the two edges form a circle. */
    public static Collection<TrackNode> getCommonNodes(ImmutableNetwork<TrackNode, TrackEdge> undirectedGraph,
                                                      TrackEdge edge1, TrackEdge edge2) {
        var intersection = Sets.intersection(
                endpointPairToSet(undirectedGraph.incidentNodes(edge1)),
                endpointPairToSet(undirectedGraph.incidentNodes(edge2))
        );
        assert intersection.size() == 1 || intersection.size() == 2;
        return intersection;
    }

    /** Creates a set from a pair of endpoints */
    public static Set<TrackNode> endpointPairToSet(EndpointPair<TrackNode> pair) {
        return Set.of(pair.nodeU(), pair.nodeV());
    }

    /** Direction on the edge that starts at the given node */
    public static Direction getDirectionFromEndpoint(ImmutableNetwork<TrackNode, TrackEdge> undirectedGraph,
                                                     TrackEdge edge, TrackNode node) {
        var endpoint = endpointOfNode(undirectedGraph, edge, node);
        return endpointFromDirection(endpoint);
    }

    /** Direction which starts at the given endpoint.
     * BEGIN -> FORWARD, END -> BACKWARD */
    public static Direction endpointFromDirection(EdgeEndpoint endpoint) {
        if (endpoint == EdgeEndpoint.BEGIN)
            return Direction.FORWARD;
        return Direction.BACKWARD;
    }

    /** Which endpoint (begin / end) the node is on the edge */
    public static EdgeEndpoint endpointOfNode(ImmutableNetwork<TrackNode, TrackEdge> undirectedGraph,
                                              TrackEdge edge, TrackNode node) {
        if (undirectedGraph.incidentNodes(edge).nodeU() == node)
            return EdgeEndpoint.BEGIN;
        assert undirectedGraph.incidentNodes(edge).nodeV() == node;
        return EdgeEndpoint.END;
    }
}
